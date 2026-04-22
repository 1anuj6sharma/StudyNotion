const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  subsection: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "SubSection", 
    required: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course", 
    required: true 
  },
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  passingScore: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  timeLimit: {
    type: Number,
    default: 10,
    min: 1
  },
  attempts: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    score: {
      type: Number,
      required: true
    },
    answers: [{
      questionIndex: Number,
      selectedAnswer: Number
    }],
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    hasPassed: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Quiz", quizSchema);
