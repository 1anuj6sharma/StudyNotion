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
      
      // Get the category with populated courses - using safe population
      const category = await Category.findById(categoryId).lean();
      
      if (!category) {
        console.error('Category not found:', categoryId);
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      
      // Safely populate courses with error handling
      let populatedCategory;
      try {
        populatedCategory = await Category.populate(category, [{
          path: 'courses',
          match: { status: 'Published' },
          select: 'courseName price thumbnail description instructor ratingAndReviews studentsEnrolled',
          options: { lean: true },
          // Safe population of nested ratingAndReviews
          populate: {
            path: 'ratingAndReviews',
            select: 'rating review',
            options: { 
              lean: true,
              // Prevent population errors if reference is invalid
              preserveNullAndEmptyArrays: true 
            }
          }
        }]);
      } catch (populateError) {
        console.error('Error populating category courses:', populateError);
        // If population fails, return the category without populated courses
        populatedCategory = { ...category, courses: [] };
      }
      
      // Ensure courses array exists and is an array
      populatedCategory.courses = Array.isArray(populatedCategory?.courses) 
        ? populatedCategory.courses.filter(course => course !== null) // Remove any null references
        : [];
      
      console.log(`Found ${populatedCategory.courses.length} published courses in category`);
      
      // Get a different random category with safe error handling
      let differentCategory = { courses: [] };
      try {
        // Find other categories excluding the current one
        const otherCategories = await Category.find({ 
          _id: { $ne: categoryId },
          courses: { $exists: true, $not: { $size: 0 } } // Only categories with courses
        }).select('_id').lean();
        
        if (otherCategories.length > 0) {
          const randomIndex = getRandomInt(otherCategories.length);
          const randomCategory = await Category.findById(otherCategories[randomIndex]._id)
            .populate({
              path: 'courses',
              match: { status: 'Published' },
              select: 'courseName price thumbnail description instructor',
              options: { 
                limit: 3, 
                lean: true,
                // Prevent population errors
                populate: { 
                  path: 'ratingAndReviews',
                  options: { preserveNullAndEmptyArrays: true }
                }
              }
            })
            .lean()
            .exec();
          
          if (randomCategory) {
            // Ensure courses is an array and filter out any null/undefined
            differentCategory = {
              ...randomCategory,
              courses: Array.isArray(randomCategory.courses) 
                ? randomCategory.courses.filter(Boolean) 
                : []
            };
          }
        }
      } catch (error) {
        console.error('Error fetching different category:', error);
        // Continue with empty differentCategory if there's an error
      }
      
      // Get top-selling courses with safe aggregation
      let topCourses = [];
      try {
        const result = await Category.aggregate([
          // Only unwind if courses array exists and is not empty
          { $match: { 'courses.0': { $exists: true } } },
          { $unwind: "$courses" },
          { 
            $match: { 
              "courses.status": "Published",
              "courses._id": { $exists: true, $ne: null }
            } 
          },
          // Safely handle studentsEnrolled array
          {
            $addFields: {
              'courses.enrolledCount': {
                $cond: {
                  if: { $isArray: "$courses.studentsEnrolled" },
                  then: { $size: "$courses.studentsEnrolled" },
                  else: 0
                }
              }
            }
          },
          // Project only needed fields
          {
            $project: {
              _id: "$courses._id",
              courseName: "$courses.courseName",
              price: "$courses.price",
              thumbnail: "$courses.thumbnail",
              description: "$courses.description",
              instructor: "$courses.instructor",
              enrolledCount: 1
            }
          },
          { $sort: { enrolledCount: -1 } },
          { $limit: 10 }
        ]);
        
        // Ensure we have a valid array result
        topCourses = Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Error fetching top courses:', error);
        // Continue with empty topCourses if there's an error
      }
      
      console.log('Successfully fetched category page data');
      
      // Prepare and send response
      const responseData = {
        success: true,
        data: {
          selectedCategory: populatedCategory,
          differentCategory: differentCategory || { courses: [] },
          mostSellingCourses: topCourses || []
        }
      };
      
      return res.status(200).json(responseData);
      
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
