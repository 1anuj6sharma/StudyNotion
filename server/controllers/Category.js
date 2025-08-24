const mongoose = require("mongoose")
const Category = require("../models/Category")

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

// ======================= CREATE CATEGORY =======================
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      })
    }

    const CategoryDetails = await Category.create({
      name,
      description,
    })

    console.log("Category Created:", CategoryDetails)

    return res.status(200).json({
      success: true,
      message: "Category Created Successfully",
      data: CategoryDetails,
    })
  } catch (error) {
    console.error("Error in createCategory:", error)
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// ======================= SHOW ALL CATEGORIES =======================
exports.showAllCategories = async (req, res) => {
  try {
    const allCategories = await Category.find()
    res.status(200).json({
      success: true,
      data: allCategories,
    })
  } catch (error) {
    console.error("Error in showAllCategories:", error)
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

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
    // Validate request body
    if (!req.body) {
      const error = new Error('Request body is empty');
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
      const error = new Error(`Invalid Category ID format: ${categoryId}`);
      error.statusCode = 400;
      throw error;
    }

    // Get selected category + courses
    log('Fetching category with ID from database...');
    
    let selectedCategory;
    try {
      const startTime = Date.now();
      selectedCategory = await Category.findById(categoryId)
        .populate({
          path: "courses",
          match: { status: "Published" },
          populate: { 
            path: "ratingAndReviews",
            select: "rating review"
          },
          select: "courseName price thumbnail description instructor ratingAndReviews studentsEnrolled"
        })
        .lean()
        .exec();

      const queryTime = Date.now() - startTime;
      log(`Category query completed in ${queryTime}ms`, { 
        categoryFound: !!selectedCategory,
        courseCount: selectedCategory?.courses?.length || 0 
      });
      
      if (!selectedCategory) {
        const error = new Error(`No category found with ID: ${categoryId}`);
        error.statusCode = 404;
        throw error;
      }
      
      // Ensure courses array exists
      selectedCategory.courses = selectedCategory.courses || [];
      
      // Log course details for debugging
      log(`Found ${selectedCategory.courses.length} published courses`, {
        courseIds: selectedCategory.courses.map(c => c._id)
      });
      
    } catch (dbError) {
      log('Database query failed', {
        error: dbError.message,
        stack: dbError.stack,
        code: dbError.code,
        name: dbError.name
      });
      
      // Check for specific MongoDB errors
      if (dbError.name === 'CastError') {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID format',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }
      
      // Handle other database errors
      return res.status(dbError.statusCode || 500).json({
        success: false,
        message: dbError.statusCode ? dbError.message : 'Error fetching category data',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
        code: dbError.code
      });
    }

    // If no courses exist in this category
    if (!selectedCategory.courses || selectedCategory.courses.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          selectedCategory: {
            ...selectedCategory,
            courses: [],
          },
          differentCategory: { courses: [] },
          mostSellingCourses: [],
        },
        message: "No published courses found in this category.",
      })
    }

    // Get a random different category
    let differentCategory = { courses: [] }
    try {
      const categoriesExceptSelected = await Category.find({
        _id: { $ne: categoryId },
      }).lean()

      if (categoriesExceptSelected.length > 0) {
        const randomIndex = getRandomInt(categoriesExceptSelected.length)
        const randomCategory = await Category.findById(
          categoriesExceptSelected[randomIndex]._id
        )
          .populate({
            path: "courses",
            match: { status: "Published" },
            select: "courseName price thumbnail description instructor ratingAndReviews studentsEnrolled"
          })
          .lean()
          .exec()

        if (randomCategory && randomCategory.courses) {
          differentCategory = randomCategory
        }
      }
    } catch (error) {
      console.error("Error fetching different category:", error)
      // Continue with empty differentCategory if there's an error
    }

    // Get top-selling courses across all categories
    let mostSellingCourses = []
    try {
      const allCategories = await Category.find()
        .populate({
          path: "courses",
          match: { status: "Published" },
          select: "courseName price thumbnail description instructor ratingAndReviews studentsEnrolled sold"
        })
        .lean()
        .exec()

      const allCourses = allCategories.flatMap(
        (category) => category.courses?.filter(course => course) || []
      )

      mostSellingCourses = allCourses
        .filter((course) => course && (typeof course.sold === "number" || course.studentsEnrolled?.length > 0))
        .sort((a, b) => {
          const aSold = a.sold || a.studentsEnrolled?.length || 0
          const bSold = b.sold || b.studentsEnrolled?.length || 0
          return bSold - aSold
        })
        .slice(0, 10)
    } catch (error) {
      console.error("Error fetching most selling courses:", error)
      // Continue with empty mostSellingCourses if there's an error
    }

    return res.status(200).json({
      success: true,
      data: {
        selectedCategory,
        differentCategory,
        mostSellingCourses,
      },
    })
  } catch (error) {
    console.error("Error in categoryPageDetails:", {
      message: error.message,
      stack: error.stack,
      request: {
        body: req.body,
        params: req.params,
        query: req.query
      }
    })
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
}
