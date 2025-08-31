const { instance } = require("../config/razorpay")
const Course = require("../models/Course")
const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const mongoose = require("mongoose")
const {
  courseEnrollmentEmail,
} = require("../mail/templates/courseEnrollmentEmail")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const CourseProgress = require("../models/CourseProgress")


// -------------------------------------------------------------------
// 1. Capture the payment and initiate the Razorpay order
// -------------------------------------------------------------------
exports.capturePayment = async (req, res) => {
  const { courses } = req.body
  const userId = req.user.id

  if (!courses || courses.length === 0) {
    return res.json({ success: false, message: "Please provide Course ID(s)" })
  }

  try {
    let total_amount = 0

    for (const course_id of courses) {
      const course = await Course.findById(course_id)
      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" })
      }

      const uid = new mongoose.Types.ObjectId(userId)
      if (course.studentsEnroled.includes(uid)) {
        return res.status(400).json({ success: false, message: "Student is already Enrolled" })
      }

      total_amount += course.price
    }

    const options = {
      amount: total_amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    }

    const paymentResponse = await instance.orders.create(options)

    return res.json({ success: true, data: paymentResponse })
  } catch (error) {
    console.error("Error in capturePayment:", error)
    return res.status(500).json({ success: false, message: "Could not initiate order." })
  }
}


// -------------------------------------------------------------------
// 2. Verify the payment
// -------------------------------------------------------------------
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courses } = req.body
  const userId = req.user.id

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
    return res.status(400).json({ success: false, message: "Payment Failed - Missing Fields" })
  }

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" })
    }

    await enrollStudents(courses, userId)
    return res.status(200).json({ success: true, message: "Payment Verified" })
  } catch (error) {
    console.error("Error in verifyPayment:", error)
    return res.status(500).json({ success: false, message: "Payment verification error" })
  }
}


// -------------------------------------------------------------------
// 3. Send Payment Success Email to Student
// -------------------------------------------------------------------
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { orderId, paymentId, amount } = req.body
  const userId = req.user.id

  if (!orderId || !paymentId || !amount || !userId) {
    return res.status(400).json({ success: false, message: "Please provide all the details" })
  }

  try {
    const student = await User.findById(userId)

    await mailSender(
      student.email,
      `Payment Received`,
      paymentSuccessEmail(
        `${student.firstName} ${student.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    )

    return res.json({ success: true, message: "Payment success email sent" })
  } catch (error) {
    console.error("Error in sendPaymentSuccessEmail:", error)
    return res.status(500).json({ success: false, message: "Could not send email" })
  }
}


// -------------------------------------------------------------------
// 4. Enroll Students + Send Emails (Student + Instructor)
// -------------------------------------------------------------------
const enrollStudents = async (courses, userId) => {
  if (!courses || !userId) {
    throw new Error("Course ID(s) and User ID are required")
  }

  for (const courseId of courses) {
    try {
      // Find course & enroll student
      const enrolledCourse = await Course.findByIdAndUpdate(
        courseId,
        { $push: { studentsEnroled: userId } },
        { new: true }
      ).populate("instructor")  // populate instructor for email

      if (!enrolledCourse) throw new Error("Course not found")

      // Create course progress
      const courseProgress = await CourseProgress.create({
        courseID: courseId,
        userId,
        completedVideos: [],
      })

      // Update student profile
      const student = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            courses: courseId,
            courseProgress: courseProgress._id,
          },
        },
        { new: true }
      )

      // --------------------------
      // Send Email to Student
      // --------------------------
      await mailSender(
        student.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(
          enrolledCourse.courseName,
          `${student.firstName} ${student.lastName}`
        )
      )

      // --------------------------
      // Send Email to Instructor
      // --------------------------
      if (enrolledCourse.instructor?.email) {
        await mailSender(
          enrolledCourse.instructor.email,
          `New Enrollment in ${enrolledCourse.courseName}`,
          `<h2>Hello ${enrolledCourse.instructor.firstName},</h2>
           <p><b>${student.firstName} ${student.lastName}</b> has enrolled in your course: <b>${enrolledCourse.courseName}</b>.</p>
           <p>Keep up the great teaching! 🚀</p>`
        )
      }

    } catch (error) {
      console.error("Error enrolling student:", error)
      throw error
    }
  }
}


