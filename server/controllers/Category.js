const Category = require("../models/Category");

// Utility to get random integer
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryDetails = await Category.create({ name, description });

    return res.status(200).json({
      success: true,
      message: "Category created successfully",
      data: categoryDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch all categories
exports.showAllCategories = async (req, res) => {
  try {
    const allCategories = await Category.find();
    res.status(200).json({
      success: true,
      data: allCategories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Fetch category page details including top and frequently bought courses
exports.categoryPageDetails = async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Get the selected category with published courses
    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "courses",
        match: { status: "Published" },
        populate: "ratingAndReviews",
      })
      .exec();

    if (!selectedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    selectedCategory.courses = selectedCategory.courses || [];

    // Pick a random different category for recommendations
    const categoriesExceptSelected = await Category.find({ _id: { $ne: categoryId } });
    let differentCategory = { courses: [] };
    if (categoriesExceptSelected.length > 0) {
      const randomIndex = getRandomInt(categoriesExceptSelected.length);
      const randomCategory = await Category.findById(categoriesExceptSelected[randomIndex]._id)
        .populate({
          path: "courses",
          match: { status: "Published" },
        })
        .exec();
      if (randomCategory) differentCategory = randomCategory;
    }

    // Get top-selling courses across all categories
    const allCategories = await Category.find()
      .populate({
        path: "courses",
        match: { status: "Published" },
      })
      .exec();
    const allCourses = allCategories.flatMap((cat) => cat.courses || []);
    const mostSellingCourses = allCourses
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      data: {
        selectedCategory,
        differentCategory,
        mostSellingCourses,
      },
    });
  } catch (error) {
    console.error("Error in categoryPageDetails:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
