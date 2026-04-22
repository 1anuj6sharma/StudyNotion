const express = require("express");
const router = express.Router();
const { auth, isInstructor, isStudent } = require("../middlewares/auth");
const {
  createQuiz,
  getQuiz,
  getQuizForInstructor,
  submitQuiz,
  updateQuiz,
  deleteQuiz,
  getCourseQuizzes
} = require("../controllers/Quiz");

// Create quiz - instructor only
router.post("/create", auth, isInstructor, createQuiz);

// Get quiz for student
router.get("/subsection/:subsectionId", auth, isStudent, getQuiz);

// Get quiz for instructor (with answers and attempts)
router.get("/instructor/subsection/:subsectionId", auth, isInstructor, getQuizForInstructor);

// Submit quiz - student only
router.post("/submit/:subsectionId", auth, isStudent, submitQuiz);

// Update quiz - instructor only
router.put("/update", auth, isInstructor, updateQuiz);

// Delete quiz - instructor only
router.delete("/delete/:subsectionId", auth, isInstructor, deleteQuiz);

// Get all quizzes for a course - instructor only
router.get("/course/:courseId", auth, isInstructor, getCourseQuizzes);

module.exports = router;
