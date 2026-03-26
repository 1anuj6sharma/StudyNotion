const crypto = require("crypto")
const User = require("../models/User")
const mailSender = require("../utils/mailSender")
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail")
const Course = require("../models/Course")
const CourseProgress = require("../models/CourseProgress")

// -------------------------------------------------------------------
// Handle Razorpay Webhooks
// -------------------------------------------------------------------
exports.webhookHandler = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("Webhook secret not configured");
    return res.status(500).json({ success: false, message: "Webhook not configured" });
  }

  // Get the webhook signature from headers
  const razorpaySignature = req.headers['x-razorpay-signature'];
  
  if (!razorpaySignature) {
    console.error("Missing Razorpay signature");
    return res.status(400).json({ success: false, message: "Missing signature" });
  }

  try {
    // Verify webhook signature
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      console.error("Invalid webhook signature");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    console.log("Webhook signature verified successfully");
    console.log("Webhook event:", req.body.event);

    // Handle different webhook events
    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(paymentEntity);
        break;
      case 'payment.failed':
        await handlePaymentFailed(paymentEntity);
        break;
      case 'payment.paid':
        await handlePaymentPaid(paymentEntity);
        break;
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};

// Helper function to handle payment captured events
const handlePaymentCaptured = async (paymentEntity) => {
  try {
    const { order_id, payment_id, notes } = paymentEntity;
    
    if (notes && notes.courses && notes.userId) {
      const courses = JSON.parse(notes.courses);
      const userId = notes.userId;
      
      console.log(`Processing payment capture for order ${order_id}, user ${userId}`);
      await enrollStudents(courses, userId);
      
      // Send payment success email
      const student = await User.findById(userId);
      if (student) {
        await mailSender(
          student.email,
          `Payment Received - Order ${order_id}`,
          paymentSuccessEmail(
            `${student.firstName} ${student.lastName}`,
            paymentEntity.amount / 100,
            order_id,
            payment_id
          )
        );
      }
    }
  } catch (error) {
    console.error("Error handling payment captured:", error);
  }
};

// Helper function to handle payment failed events
const handlePaymentFailed = async (paymentEntity) => {
  try {
    console.log(`Payment failed for order ${paymentEntity.order_id}:`, paymentEntity.error);
    // You can implement failed payment logic here (send notifications, etc.)
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
};

// Helper function to handle payment paid events
const handlePaymentPaid = async (paymentEntity) => {
  try {
    console.log(`Payment paid for order ${paymentEntity.order_id}`);
    // Similar to captured, you can handle paid events here
  } catch (error) {
    console.error("Error handling payment paid:", error);
  }
};

// Enroll Students function (copied from Payments.js)
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
        `<h2>Hello ${student.firstName} ${student.lastName},</h2>
         <p>You have successfully enrolled in the course: <b>${enrolledCourse.courseName}</b>.</p>
         <p>Happy learning! 🚀</p>`
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
