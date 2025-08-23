const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");

// Get course recommendations based on user's enrolled courses and preferences
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user details with enrolled courses
    const user = await User.findById(userId).populate({
      path: "courses",
      populate: {
        path: "category",
        model: "Category"
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get categories from user's enrolled courses
    const enrolledCategories = user.courses.map(course => course.category._id);
    const uniqueCategories = [...new Set(enrolledCategories.map(cat => cat.toString()))];

    // Get recommended courses from similar categories
    let recommendedCourses = [];

    if (uniqueCategories.length > 0) {
      recommendedCourses = await Course.find({
        category: { $in: uniqueCategories },
        _id: { $nin: user.courses.map(course => course._id) }, // Exclude already enrolled courses
        status: "Published"
      })
      .populate("category", "name")
      .populate("instructor", "firstName lastName email image")
      .populate("ratingAndReviews")
      .limit(6)
      .sort({ createdAt: -1 });
    }

    // If not enough recommendations from user's categories, get popular courses
    if (recommendedCourses.length < 6) {
      const additionalCourses = await Course.find({
        _id: { 
          $nin: [
            ...user.courses.map(course => course._id),
            ...recommendedCourses.map(course => course._id)
          ]
        },
        status: "Published"
      })
      .populate("category", "name")
      .populate("instructor", "firstName lastName email image")
      .populate("ratingAndReviews")
      .limit(6 - recommendedCourses.length)
      .sort({ studentsEnrolled: -1 }); // Sort by popularity

      recommendedCourses = [...recommendedCourses, ...additionalCourses];
    }

    // Calculate average rating for each course
    const coursesWithRating = recommendedCourses.map(course => {
      const ratings = course.ratingAndReviews;
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length 
        : 0;
      
      return {
        ...course.toObject(),
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length
      };
    });

    return res.status(200).json({
      success: true,
      message: "Recommendations fetched successfully",
      data: coursesWithRating
    });

  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get trending courses (most enrolled in last 30 days)
exports.getTrendingCourses = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendingCourses = await Course.find({
      status: "Published",
      createdAt: { $gte: thirtyDaysAgo }
    })
    .populate("category", "name")
    .populate("instructor", "firstName lastName email image")
    .populate("ratingAndReviews")
    .sort({ studentsEnrolled: -1 })
    .limit(8);

    // Calculate average rating for each course
    const coursesWithRating = trendingCourses.map(course => {
      const ratings = course.ratingAndReviews;
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, review) => sum + review.rating, 0) / ratings.length 
        : 0;
      
      return {
        ...course.toObject(),
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length
      };
    });

    return res.status(200).json({
      success: true,
      message: "Trending courses fetched successfully",
      data: coursesWithRating
    });

  } catch (error) {
    console.error("Error fetching trending courses:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
