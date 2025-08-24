const mongoose = require("mongoose");
const Category = require("../models/Category");

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// ======================= CREATE CATEGORY =======================
exports.createCategory = async (req, res) => {
  try {
    // Fetch data from request body
    const { name, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    // Create entry in DB
    const category = await Category.create({
      name,
      description,
    });

    return res.status(200).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error in createCategory:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================= SHOW ALL CATEGORIES =======================
exports.showAllCategories = async (req, res) => {
  try {
    const allCategories = await Category.find();
    res.status(200).json({
      success: true,
      data: allCategories,
    });
  } catch (error) {
    console.error("Error in showAllCategories:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ======================= CATEGORY PAGE DETAILS =======================
exports.categoryPageDetails = async (req, res) => {
  console.log('=== CATEGORY PAGE DETAILS REQUEST ===');
  console.log('Request body:', req.body);
  
  try {
    // Check if request body exists and has categoryId
    if (!req.body) {
      console.error('No request body received');
      return res.status(400).json({
        success: false,
        message: 'Request body is required'
      });
    }
    
    const { categoryId } = req.body;
    
    if (!categoryId) {
      console.error('No categoryId provided in request');
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }
    
    console.log('Processing categoryId:', categoryId);
    
    // Validate categoryId format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error('Invalid categoryId format:', categoryId);
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID format'
      });
    }

    try {
      console.log('Fetching category with ID:', categoryId);
      
      // Get the category with populated courses
      const category = await Category.findById(categoryId)
        .populate({
          path: 'courses',
          match: { status: 'Published' },
          select: 'courseName price thumbnail description instructor ratingAndReviews studentsEnrolled',
          populate: {
            path: 'ratingAndReviews',
            select: 'rating review'
          }
        })
        .lean()
        .exec();
      
      if (!category) {
        console.error('Category not found:', categoryId);
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      // Ensure courses array exists
      category.courses = category.courses || [];
      console.log(`Found ${category.courses.length} published courses in category`);
      
      // Get a different random category
      let differentCategory = { courses: [] };
      const otherCategories = await Category.find({ _id: { $ne: categoryId } }).lean();
      
      if (otherCategories.length > 0) {
        const randomIndex = getRandomInt(otherCategories.length);
        differentCategory = await Category.findById(otherCategories[randomIndex]._id)
          .populate({
            path: 'courses',
            match: { status: 'Published' },
            select: 'courseName price thumbnail description instructor',
            options: { limit: 3 }
          })
          .lean()
          .exec() || { courses: [] };
      }
      
      // Get top-selling courses (simplified - using studentsEnrolled as a metric)
      const topCourses = await Category.aggregate([
        { $unwind: "$courses" },
        { 
          $match: { 
            "courses.status": "Published",
            "courses._id": { $exists: true }
          } 
        },
        {
          $project: {
            course: "$courses",
            enrolledCount: { $size: { $ifNull: ["$courses.studentsEnrolled", []] } }
          }
        },
        { $sort: { enrolledCount: -1 } },
        { $limit: 10 },
        {
          $replaceRoot: { newRoot: "$course" }
        }
      ]);
      
      console.log('Successfully fetched category page data');
      
      // Return the response
      return res.status(200).json({
        success: true,
        data: {
          selectedCategory: category,
          differentCategory: differentCategory || { courses: [] },
          mostSellingCourses: topCourses || []
        }
      });
      
    } catch (error) {
      console.error('Error in categoryPageDetails:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      });
      
      // Handle specific error types
      if (error.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format'
        });
      }
      
      // Handle other errors
      return res.status(500).json({
        success: false,
        message: 'Error fetching category data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } catch (error) {
    console.error('Unexpected error in categoryPageDetails:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
