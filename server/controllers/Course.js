// Import necessary modules and models
const Course = require("../models/Course")
const Category = require("../models/Category")
const Section = require("../models/Section")
const SubSection = require("../models/SubSection")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const CourseProgress = require("../models/CourseProgress")
const { convertSecondsToDuration } = require("../utils/secToDuration")


// ------------------------------------------------------------------------------------------------
// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const { courseName, courseDescription, whatYouWillLearn, price, tag, category, instructions } = req.body
    const thumbnail = req.files?.thumbnailImage

    // Validate required fields
    if (!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !category || !thumbnail) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      })
    }

    // Parse tag and instructions if they are strings
    const parsedTag = Array.isArray(tag) ? tag : JSON.parse(tag)
    const parsedInstructions = Array.isArray(instructions) ? instructions : JSON.parse(instructions)

    // Check if the user is an instructor
    const userId = req.user.id
    const instructorDetails = await User.findOne({ _id: userId, accountType: "Instructor" })
    if (!instructorDetails) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found",
      })
    }

    // Validate category
    const categoryDetails = await Category.findById(category)
    if (!categoryDetails) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      })
    }

    // Upload thumbnail to Cloudinary
    const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME)

    // Create a new course
    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn,
      price,
      tag: parsedTag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      instructions: parsedInstructions,
    })

    // Add the new course to the user and category
    await User.findByIdAndUpdate(instructorDetails._id, { $push: { courses: newCourse._id } }, { new: true })
    await Category.findByIdAndUpdate(categoryDetails._id, { $push: { courses: newCourse._id } }, { new: true })

    return res.status(200).json({
      success: true,
      message: "Course created successfully",
      data: newCourse,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    })
  }
}


// ------------------------------------------------------------------------------------------------
// Get all courses (lightweight)
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find(
      {},
      {
        courseName: true,
        price: true,
        thumbnail: true,
        instructor: true,
        ratingAndReviews: true,
        studentsEnrolled: true,
      }
    )
      .populate("instructor")
      .exec()

    return res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: allCourses,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Failed to get courses",
      error: error.message,
    })
  }
}


// ------------------------------------------------------------------------------------------------
// Get full details of a specific course
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      })
    }

    const courseDetails = await Course.findById(courseId)
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
          select: "-videoUrl", // hide video for public view
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      })
    }

    // Return course details in the expected format
    return res.status(200).json({
      success: true,
      message: "Course details fetched successfully",
      data: {
        courseDetails: courseDetails
      }
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Failed to get course details",
      error: error.message,
    })
  }
}


// ------------------------------------------------------------------------------------------------
// Edit a course
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const updates = req.body
    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({ error: "Course not found" })
    }

    // If thumbnail image is provided, upload and update it
    if (req.files && req.files.thumbnailImage) {
      const thumbnail = await uploadImageToCloudinary(
        req.files.thumbnailImage,
        process.env.FOLDER_NAME
      )
      course.thumbnail = thumbnail.secure_url
    }

    // Update other fields
    for (const key in updates) {
      if (["tag", "instructions"].includes(key)) {
        try {
          course[key] = Array.isArray(updates[key]) ? updates[key] : JSON.parse(updates[key])
        } catch {
          return res.status(400).json({ success: false, message: `Invalid JSON for ${key}` })
        }
      } else {
        course[key] = updates[key]
      }
    }

    await course.save()

    const updatedCourse = await Course.findOne({ _id: courseId })
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection",
        },
      })
      .exec()

    res.json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
    })
  }
}


// ------------------------------------------------------------------------------------------------
// Get full course details for enrolled students
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body
    const userId = req.user.id

    const courseDetails = await Course.findById(courseId)
      .populate({
        path: "instructor",
        populate: {
          path: "additionalDetails",
        },
      })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({
        path: "courseContent",
        populate: {
          path: "subSection", // here videoUrl is included
        },
      })
      .exec()

    if (!courseDetails) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      })
    }

    let courseProgressCount = await CourseProgress.findOne({
      courseId: courseId,
      userId: userId,
    })

    return res.status(200).json({
      success: true,
      message: "Course details fetched successfully",
      data: {
        courseDetails,
        completedVideos: courseProgressCount?.completedVideos || [],
      },
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Failed to get course details",
      error: error.message,
    })
  }
}


// ------------------------------------------------------------------------------------------------
// Get all courses by instructor
exports.getInstructorCourses = async (req, res) => {
  try {
    const instructorId = req.user.id
    const instructorCourses = await Course.find({ instructor: instructorId }).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      message: "Instructor courses fetched successfully",
      data: instructorCourses,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: "Failed to get instructor courses",
      error: error.message,
    })
  }
}


// ------------------------------------------------------------------------------------------------
// Delete a course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" })
    }

    // Unenroll students from the course
    await User.updateMany({ _id: { $in: course.studentsEnrolled } }, { $pull: { courses: courseId } })

    // Delete sections and sub-sections
    for (const sectionId of course.courseContent) {
      const section = await Section.findById(sectionId)
      if (section) {
        for (const subSectionId of section.subSection) {
          await SubSection.findByIdAndDelete(subSectionId)
        }
      }
      await Section.findByIdAndDelete(sectionId)
    }

    await Course.findByIdAndDelete(courseId)

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    })
  }
}
