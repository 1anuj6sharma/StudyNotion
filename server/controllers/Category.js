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
  const requestId = Math.random().toString(36).substring(2, 8);
  const log = (message, data) => {
    console.log(`[${requestId}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };

  log('=== CATEGORY PAGE DETAILS REQUEST ===');
  log('Request details:', {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body
  });
  
  try {
    // Check if request body exists and has categoryId
    if (!req.body || typeof req.body !== 'object') {
      const error = new Error('Invalid request body');
      error.statusCode = 400;
      throw error;
    }
    
    const { categoryId } = req.body;
    log('Extracted categoryId:', { categoryId });

    if (!categoryId) {
      const error = new Error('Category ID is required');
      error.statusCode = 400;
      throw error;
    }

    // Validate categoryId format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const error = new Error('Invalid Category ID format');
      error.statusCode = 400;
      throw error;
    }

    // Get selected category
    log(`Fetching category with ID: ${categoryId}`);
    
    // First, get the category without populating courses to check if it exists
    const category = await Category.findById(categoryId).lean();
    
    if (!category) {
      log(`Category not found: ${categoryId}`);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Now get the category with populated courses
    const startTime = Date.now();
    const populatedCategory = await Category.findById(categoryId)
      .populate({
        path: 'courses',
        match: { status: 'Published' },
        select: 'courseName price thumbnail description instructor ratingAndReviews studentsEnrolled',
        populate: {
          path: 'ratingAndReviews',
          select: 'rating review'
        }
      })
      .lean();
    
    const queryTime = Date.now() - startTime;
    log(`Category query completed in ${queryTime}ms`, {
      categoryFound: !!populatedCategory,
      courseCount: populatedCategory?.courses?.length || 0
    });
    
    // Ensure courses array exists
    populatedCategory.courses = populatedCategory.courses || [];
    
    // Log course details for debugging
    log(`Found ${populatedCategory.courses.length} published courses`, {
      courseIds: populatedCategory.courses.map(c => c._id)
    });
    
    // Get a different random category
    let differentCategory = { courses: [] };
    const allCategories = await Category.find({ _id: { $ne: categoryId } }).lean();
    
    if (allCategories.length > 0) {
      const randomIndex = getRandomInt(allCategories.length);
      differentCategory = await Category.findById(allCategories[randomIndex]._id)
        .populate({
          path: 'courses',
          match: { status: 'Published' },
          select: 'courseName price thumbnail description instructor ratingAndReviews studentsEnrolled',
          populate: {
            path: 'ratingAndReviews',
            select: 'rating review'
          }
        })
        .lean();
    }
    
    // Get top-selling courses (simplified - can be enhanced with actual sales data)
    let mostSellingCourses = [];
    try {
      const allCategories = await Category.find()
        .populate({
          path: "courses",
          match: { status: "Published" },
          select: "courseName price thumbnail description instructor ratingAndReviews studentsEnrolled sold"
        })
        .lean()
        .exec();

      const allCourses = allCategories.flatMap(
        (category) => category.courses?.filter(course => course) || []
      );

      mostSellingCourses = allCourses
        .filter((course) => course && (typeof course.sold === "number" || (course.studentsEnrolled?.length > 0)))
        .sort((a, b) => {
          const aSold = a.sold || a.studentsEnrolled?.length || 0;
          const bSold = b.sold || b.studentsEnrolled?.length || 0;
          return bSold - aSold;
        })
        .slice(0, 10);
    } catch (error) {
      log('Error fetching most selling courses:', {
        error: error.message,
        stack: error.stack
      });
      // Continue with empty mostSellingCourses if there's an error
    }
    
    // Return the response
    return res.status(200).json({
      success: true,
      data: {
        selectedCategory: populatedCategory,
        differentCategory: differentCategory || { courses: [] },
        mostSellingCourses: mostSellingCourses || []
      }
    });
    
  } catch (error) {
    log('Error in categoryPageDetails:', {
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
};
