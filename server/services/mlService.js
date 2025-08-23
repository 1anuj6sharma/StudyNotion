const { Course, CourseAnalytics, User, Rating } = require('../models');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Content-based filtering: Recommend courses similar to what the user has liked
async function getContentBasedRecommendations(userId, limit = 5) {
  try {
    // Get user's enrolled courses and their categories
    const user = await User.findById(userId)
      .populate('courses')
      .populate('enrolledCourses.course');

    if (!user) return [];

    // Extract categories from enrolled courses
    const enrolledCategories = [];
    user.enrolledCourses.forEach(enrollment => {
      if (enrollment.course?.category) {
        enrolledCategories.push(enrollment.course.category);
      }
    });

    // Find similar courses based on categories
    const recommendedCourses = await Course.find({
      _id: { $nin: user.enrolledCourses.map(ec => ec.course?._id) }, // Not already enrolled
      category: { $in: enrolledCategories },
      status: 'Published'
    })
    .sort({ 'rating.average': -1, 'students': -1 })
    .limit(limit);

    return recommendedCourses;
  } catch (error) {
    console.error('Content-based recommendation error:', error);
    return [];
  }
}

// Collaborative filtering: Recommend courses liked by similar users
async function getCollaborativeRecommendations(userId, limit = 5) {
  try {
    // Get users who have similar course preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) return [];

    // Find users who have similar enrolled courses
    const similarUsers = await User.aggregate([
      { $match: { 
        _id: { $ne: currentUser._id },
        'enrolledCourses.course': { $in: currentUser.enrolledCourses.map(ec => ec.course) }
      }},
      { $project: {
        _id: 1,
        commonCourses: {
          $size: {
            $setIntersection: [
              currentUser.enrolledCourses.map(ec => ec.course.toString()),
              '$enrolledCourses.course'
            ]
          }
        }
      }},
      { $sort: { commonCourses: -1 } },
      { $limit: 10 }
    ]);

    if (similarUsers.length === 0) return [];

    // Get courses from similar users that current user hasn't enrolled in
    const recommendedCourses = await Course.aggregate([
      { $match: {
        _id: { $nin: currentUser.enrolledCourses.map(ec => ec.course) },
        'instructor': { $ne: currentUser._id },
        'status': 'Published'
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'enrolledCourses.course',
        as: 'enrolledUsers'
      }},
      { $addFields: {
        similarUserCount: {
          $size: {
            $setIntersection: [
              similarUsers.map(u => u._id.toString()),
              '$enrolledUsers._id'
            ]
          }
        }
      }},
      { $sort: { similarUserCount: -1, 'rating.average': -1 } },
      { $limit: limit }
    ]);

    return recommendedCourses;
  } catch (error) {
    console.error('Collaborative recommendation error:', error);
    return [];
  }
}

// Hybrid recommendation: Combine content-based and collaborative filtering
async function getHybridRecommendations(userId, limit = 5) {
  try {
    const [contentBased, collaborative] = await Promise.all([
      getContentBasedRecommendations(userId, limit / 2),
      getCollaborativeRecommendations(userId, limit / 2)
    ]);

    // Combine and deduplicate recommendations
    const combined = [...contentBased, ...collaborative];
    const uniqueCourses = [];
    const courseIds = new Set();

    for (const course of combined) {
      const id = course._id.toString();
      if (!courseIds.has(id)) {
        courseIds.add(id);
        uniqueCourses.push(course);
      }
      if (uniqueCourses.length >= limit) break;
    }

    return uniqueCourses;
  } catch (error) {
    console.error('Hybrid recommendation error:', error);
    return [];
  }
}

// Generate AI-powered course creation suggestions
async function generateCourseSuggestions(userId) {
  try {
    const user = await User.findById(userId).populate('courses');
    if (!user) return [];

    // Get market trends and user's teaching history
    const marketTrends = await CourseAnalytics.aggregate([
      { $sort: { marketDemandScore: -1 } },
      { $limit: 10 },
      { $lookup: {
        from: 'courses',
        localField: 'courseId',
        foreignField: '_id',
        as: 'course'
      }}
    ]);

    // Prepare context for AI
    const context = {
      userExpertise: user.expertise || [],
      userCourses: user.courses.map(c => c.title),
      marketTrends: marketTrends.map(t => ({
        title: t.course[0]?.title,
        category: t.course[0]?.category,
        demandScore: t.marketDemandScore,
        studentCount: t.studentCount
      }))
    };

    // Generate suggestions using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert course creation advisor. Analyze the following data and provide 5 specific course topic suggestions that would be valuable for the instructor based on their expertise and current market trends.`
        },
        {
          role: "user",
          content: `Instructor's expertise: ${context.userExpertise.join(', ')}. \n` +
                   `Their existing courses: ${context.userCourses.join(', ')}. \n` +
                   `Market trends: ${JSON.stringify(context.marketTrends, null, 2)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content.split('\n')
      .filter(line => line.trim().match(/^\d+\./)) // Only get numbered list items
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
  } catch (error) {
    console.error('Course suggestion generation error:', error);
    return [];
  }
}

module.exports = {
  getContentBasedRecommendations,
  getCollaborativeRecommendations,
  getHybridRecommendations,
  generateCourseSuggestions
};
