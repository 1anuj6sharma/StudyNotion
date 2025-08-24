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
  try {
    console.log('Request body:', req.body); // Log the incoming request
    
    const { categoryId } = req.body;

    if (!categoryId) {
      console.error('No categoryId provided in request');
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Validate categoryId format
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.error('Invalid categoryId format:', categoryId);
      return res.status(400).json({
        success: false,
        message: "Invalid Category ID format",
      });
    }

    // Get selected category + courses
    const selectedCategory = await Category.findById(categoryId)
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
      .exec()

    if (!selectedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
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
