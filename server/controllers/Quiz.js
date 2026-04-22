const Quiz = require("../models/Quiz");
const Course = require("../models/Course");
const SubSection = require("../models/SubSection");

// Create a new quiz for a subsection
exports.createQuiz = async (req, res) => {
  try {
    console.log("Received request body:", req.body);
    const { subsection, course, title, description, questions, passingScore, timeLimit } = req.body;

    if (!subsection || !course || !title || !questions || questions.length === 0) {
      console.log("Validation failed - missing fields:", {
        subsection: !subsection,
        course: !course,
        title: !title,
        questions: !questions,
        questionsLength: questions?.length
      });
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question || !question.options || question.options.length < 2 || 
          question.correctAnswer === undefined || question.correctAnswer < 0 || 
          question.correctAnswer >= question.options.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid question at index ${i}. Each question must have a question text, at least 2 options, and a valid correct answer index.`,
        });
      }
    }

    // Check if quiz already exists for this subsection
    const existingQuiz = await Quiz.findOne({ subsection });
    if (existingQuiz) {
      return res.status(400).json({
        success: false,
        message: "Quiz already exists for this subsection",
      });
    }

    const quizData = {
      subsection,
      course,
      title,
      description,
      questions,
      passingScore: passingScore || 3,
      timeLimit: timeLimit || 10,
    };

    const quiz = await Quiz.create(quizData);

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: quiz,
    });
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create quiz",
      error: error.message,
    });
  }
};

// Get quiz for a student
exports.getQuiz = async (req, res) => {
  try {
    const { subsectionId } = req.params;
    const studentId = req.user.id;

    const quiz = await Quiz.findOne({ 
      subsection: subsectionId, 
      isActive: true 
    })
    .populate('course', 'courseName')
    .populate('subsection', 'title');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Check if student has already attempted this quiz
    const attempts = quiz.attempts.filter(attempt => 
      attempt.student.toString() === studentId
    );

    // Don't send correct answers to students
    const quizForStudent = {
      ...quiz.toObject(),
      questions: quiz.questions.map(q => ({
        question: q.question,
        options: q.options
      })),
      attempts: attempts.map(attempt => ({
        score: attempt.score,
        attemptedAt: attempt.attemptedAt,
        hasPassed: attempt.hasPassed
      }))
    };

    res.status(200).json({
      success: true,
      data: quizForStudent,
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quiz",
      error: error.message,
    });
  }
};

// Get quiz for instructor (with answers and attempts)
exports.getQuizForInstructor = async (req, res) => {
  try {
    const { subsectionId } = req.params;

    const quiz = await Quiz.findOne({ subsection: subsectionId })
      .populate('course', 'courseName')
      .populate('subsection', 'title')
      .populate('attempts.student', 'firstName lastName email');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    console.error("Error fetching quiz for instructor:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quiz",
      error: error.message,
    });
  }
};

// Submit quiz - student only
exports.submitQuiz = async (req, res) => {
  try {
    const { subsectionId } = req.params;
    const { answers } = req.body;
    const studentId = req.user.id;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide answers",
      });
    }

    const quiz = await Quiz.findOne({ subsection: subsectionId, isActive: true });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    // Calculate score
    let score = 0;
    const results = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i];
      const studentAnswer = answers[i];
      const isCorrect = studentAnswer === question.correctAnswer;
      
      if (isCorrect) {
        score++;
      }

      results.push({
        questionIndex: i,
        selectedAnswer: studentAnswer,
        isCorrect,
        correctAnswer: question.correctAnswer
      });
    }

    const hasPassed = score >= quiz.passingScore;

    // Check if student has already passed this quiz
    const existingAttempt = quiz.attempts.find(attempt => 
      attempt.student.toString() === studentId && attempt.hasPassed
    );

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message: "You have already passed this quiz",
      });
    }

    // Add attempt to quiz
    quiz.attempts.push({
      student: studentId,
      score,
      answers: answers.map((answer, index) => ({
        questionIndex: index,
        selectedAnswer: answer
      })),
      hasPassed
    });

    await quiz.save();

    res.status(200).json({
      success: true,
      message: hasPassed ? "Quiz passed successfully!" : "Quiz submitted. Please try again.",
      data: {
        score,
        totalQuestions: quiz.questions.length,
        passingScore: quiz.passingScore,
        hasPassed,
        results
      }
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit quiz",
      error: error.message,
    });
  }
};

// Update quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, description, questions, passingScore, timeLimit } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      if (!question.question || !question.options || question.options.length < 2 || 
          question.correctAnswer === undefined || question.correctAnswer < 0 || 
          question.correctAnswer >= question.options.length) {
        return res.status(400).json({
          success: false,
          message: `Invalid question at index ${i}. Each question must have a question text, at least 2 options, and a valid correct answer index.`,
        });
      }
    }

    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { title, description, questions, passingScore, timeLimit },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quiz updated successfully",
      data: quiz,
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update quiz",
      error: error.message,
    });
  }
};

// Delete quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const { subsectionId } = req.params;

    const quiz = await Quiz.findOneAndDelete({ subsection: subsectionId });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Quiz deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete quiz",
      error: error.message,
    });
  }
};

// Get all quizzes for a course
exports.getCourseQuizzes = async (req, res) => {
  try {
    const { courseId } = req.params;

    const quizzes = await Quiz.find({ course: courseId, isActive: true })
      .populate('subsection', 'title')
      .populate('attempts.student', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: quizzes,
    });
  } catch (error) {
    console.error("Error fetching course quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course quizzes",
      error: error.message,
    });
  }
};
