const { Course, CourseAnalytics, User, Rating } = require('../models');

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

module.exports = {
  getContentBasedRecommendations,
  getCollaborativeRecommendations,
  getHybridRecommendations
};
