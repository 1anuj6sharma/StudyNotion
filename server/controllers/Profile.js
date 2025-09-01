const mongoose = require("mongoose")

// Import models using mongoose.model() to ensure they're registered
const Profile = require("../models/Profile")
const CourseProgress = require("../models/CourseProgress")
const Course = require("../models/Course")
const User = require("../models/User")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const { convertSecondsToDuration } = require("../utils/secToDuration")

// Ensure models are registered with Mongoose
require("../models/User")  // This ensures User model is registered
require("../models/Course")  // This ensures Course model is registered
require("../models/Section")  // This ensures Section model is registered
// Method for updating a profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName = "",
      lastName = "",
      dateOfBirth = "",
      about = "",
      contactNumber = "",
      gender = "",
    } = req.body
    const id = req.user.id

    // Find the profile by id
    const userDetails = await User.findById(id)
    const profile = await Profile.findById(userDetails.additionalDetails)

    const user = await User.findByIdAndUpdate(id, {
      firstName,
      lastName,
    })
    await user.save()

    // Update the profile fields
    profile.dateOfBirth = dateOfBirth
    profile.about = about
    profile.contactNumber = contactNumber
    profile.gender = gender

    // Save the updated profile
    await profile.save()

    // Find the updated user details
    const updatedUserDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()

    return res.json({
      success: true,
      message: "Profile updated successfully",
      updatedUserDetails,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}

exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id
    console.log(id)
    const user = await User.findById({ _id: id })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }
    // Delete Assosiated Profile with the User
    await Profile.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(user.additionalDetails),
    })
    for (const courseId of user.courses) {
      await Course.findByIdAndUpdate(
        courseId,
        { $pull: { studentsEnroled: id } },
        { new: true }
      )
    }
    // Now Delete User
    await User.findByIdAndDelete({ _id: id })
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    })
    await CourseProgress.deleteMany({ userId: id })
  } catch (error) {
    console.log(error)
    res
      .status(500)
      .json({ success: false, message: "User Cannot be deleted successfully" })
  }
}

exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id
    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec()
    console.log(userDetails)
    res.status(200).json({
      success: true,
      message: "User Data fetched successfully",
      data: userDetails,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture
    const userId = req.user.id
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    )
    console.log(image)
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      })
    }

    // Find user with basic info first
    const user = await User.findById(userId).select('courses').lean().exec()
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // If user has no enrolled courses, return empty array
    if (!user.courses || user.courses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No courses enrolled yet"
      })
    }

    // Get all non-draft courses with necessary fields
    const courses = await Course.find({
      _id: { $in: user.courses },
      status: { $ne: "Draft" }
    })
    .select('courseContent instructor courseName courseDescription price thumbnail')
    .populate({
      path: 'courseContent',
      select: 'subSection',
      populate: {
        path: 'subSection',
        select: 'timeDuration',
      },
    })
    .populate('instructor', 'firstName lastName image')
    .lean()
    .exec()

    if (!courses || courses.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: "No active courses found"
      })
    }

    // Get all course progresses in a single query
    const courseProgresses = await CourseProgress.find({
      userId: userId,
      courseID: { $in: courses.map(c => c._id) }
    }).lean().exec()

    // Create a map of courseId to progress for quick lookup
    const progressMap = new Map(
      courseProgresses.map(progress => [progress.courseID.toString(), progress])
    )

    // Process each course with progress
    const coursesWithProgress = await Promise.all(courses.map(async (course) => {
      if (!course) return null;
      
      // Calculate total duration and subsections
      let totalDurationInSeconds = 0;
      let totalSubsections = 0;
      
      if (course.courseContent && course.courseContent.length > 0) {
        course.courseContent.forEach(content => {
          if (content?.subSection?.length > 0) {
            totalDurationInSeconds += content.subSection.reduce(
              (acc, curr) => acc + (parseInt(curr?.timeDuration) || 0),
              0
            )
            totalSubsections += content.subSection.length
          }
        })
      }

      // Get progress for this course
      const progress = progressMap.get(course._id.toString())
      const completedVideos = progress?.completedVideos || []
      
      // Calculate progress percentage
      let progressPercentage = 0
      if (totalSubsections > 0 && completedVideos.length > 0) {
        progressPercentage = Math.min(
          Math.round((completedVideos.length / totalSubsections) * 10000) / 100,
          100 // Cap at 100%
        )
      } else if (totalSubsections === 0) {
        progressPercentage = 100; // If no subsections, show as completed
      }

      return {
        ...course,
        totalDuration: convertSecondsToDuration(totalDurationInSeconds),
        progressPercentage,
        completedVideos: completedVideos.length,
        totalVideos: totalSubsections
      }
    }))

    // Filter out any null/undefined courses
    const validCourses = coursesWithProgress.filter(Boolean)

    return res.status(200).json({
      success: true,
      data: validCourses,
    })
  } catch (error) {
    console.error('Error in getEnrolledCourses:', error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch enrolled courses. Please try again later.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

exports.instructorDashboard = async (req, res) => {
  try {
    const courseDetails = await Course.find({ instructor: req.user.id })

    const courseData = courseDetails.map((course) => {
      const totalStudentsEnrolled = course.studentsEnroled.length
      const totalAmountGenerated = totalStudentsEnrolled * course.price

      // Create a new object with the additional fields
      const courseDataWithStats = {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        totalStudentsEnrolled,
        totalAmountGenerated,
      }

      return courseDataWithStats
    })

    res.status(200).json({ courses: courseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}
