import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { RxCross2 } from "react-icons/rx";
import { submitQuiz, getQuiz } from "../../../services/operations/quizAPI";

const QuizModal = ({ 
  isOpen, 
  onClose, 
  subsectionId, 
  onQuizComplete, 
  videoTitle 
}) => {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (isOpen && subsectionId) {
      loadQuiz();
    }
  }, [isOpen, subsectionId, loadQuiz]);

  useEffect(() => {
    let timer;
    if (quizStarted && !quizSubmitted && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && quizStarted && !quizSubmitted) {
      handleSubmitQuiz();
    }
    return () => clearTimeout(timer);
  }, [quizStarted, quizSubmitted, timeLeft, handleSubmitQuiz]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const quiz = await getQuiz(subsectionId);
      if (quiz) {
        setQuizData(quiz);
        setTimeLeft(quiz.timeLimit * 60); // Convert minutes to seconds
        setAnswers(new Array(quiz.questions.length).fill(null));
        
        // Check if there are previous attempts
        if (quiz.attempts && quiz.attempts.length > 0) {
          const latestAttempt = quiz.attempts[quiz.attempts.length - 1];
          // Only show results if the user has passed the quiz
          if (latestAttempt.hasPassed) {
            setResults({
              score: latestAttempt.score,
              totalQuestions: quiz.questions.length,
              passingScore: quiz.passingScore,
              hasPassed: true
            });
            setQuizSubmitted(true);
          }
          // If failed, allow retake - don't show results automatically
        }
      } else {
        toast.error("Quiz not found for this lecture");
        onClose();
      }
    } catch (error) {
      console.error("Error loading quiz:", error);
      toast.error("Failed to load quiz");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setQuizStarted(true);
  };

  const selectAnswer = (questionIndex, answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (answers.includes(null)) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    try {
      setLoading(true);
      const result = await submitQuiz(subsectionId, answers);
      setResults(result);
      setQuizSubmitted(true);
      
      if (result.hasPassed) {
        toast.success(`Congratulations! You passed the quiz with ${result.score}/${result.totalQuestions} correct answers!`);
        onQuizComplete && onQuizComplete(subsectionId);
      } else {
        toast.error(`You scored ${result.score}/${result.totalQuestions}. You need ${result.passingScore} or more to pass. Please try again!`);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error(error.message || "Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const retakeQuiz = () => {
    setQuizSubmitted(false);
    setQuizStarted(false);
    setCurrentQuestion(0);
    setAnswers(new Array(quizData.questions.length).fill(null));
    setTimeLeft(quizData.timeLimit * 60);
    setResults(null);
  };

  if (!isOpen) return null;

  if (loading && !quizData) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading quiz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted && !quizSubmitted) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{videoTitle} - Quiz</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <RxCross2 size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Quiz Instructions:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>There are {quizData?.questions?.length || 5} questions in this quiz</li>
                <li>You need {quizData?.passingScore || 3} correct answers to pass</li>
                <li>Time limit: {quizData?.timeLimit || 10} minutes</li>
                <li>Once started, the timer cannot be paused</li>
                <li>You cannot retake the quiz if you pass</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Make sure you have a stable internet connection before starting the quiz.
              </p>
            </div>

            <button
              onClick={startQuiz}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (quizSubmitted && results) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Quiz Results</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <RxCross2 size={24} />
            </button>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${results.hasPassed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-center">
                <div className={`text-3xl font-bold mb-2 ${results.hasPassed ? 'text-green-600' : 'text-red-600'}`}>
                  {results.hasPassed ? 'PASSED!' : 'FAILED'}
                </div>
                <p className="text-lg">
                  Your Score: {results.score}/{results.totalQuestions}
                </p>
                <p className="text-sm text-gray-600">
                  Passing Score: {results.passingScore}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Review Your Answers:</h3>
              {results.results?.map((result, index) => (
                <div key={index} className="border rounded p-3">
                  <p className="text-sm font-medium mb-1">Question {index + 1}</p>
                  <p className={`text-sm ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isCorrect ? 'Correct' : 'Incorrect'}
                  </p>
                  {!result.isCorrect && (
                    <p className="text-xs text-gray-500">
                      Correct answer: Option {result.correctAnswer + 1}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              {!results.hasPassed && (
                <button
                  onClick={retakeQuiz}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retake Quiz
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Question {currentQuestion + 1} of {quizData.questions.length}</h2>
            <div className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
              Time Left: {formatTime(timeLeft)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <RxCross2 size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quizData.questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">
            {quizData.questions[currentQuestion].question}
          </h3>

          <div className="space-y-3">
            {quizData.questions[currentQuestion].options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  answers[currentQuestion] === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion}`}
                  checked={answers[currentQuestion] === index}
                  onChange={() => selectAnswer(currentQuestion, index)}
                  className="mr-3"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevQuestion}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-500"
          >
            Previous
          </button>

          <div className="text-sm text-gray-600">
            Question {currentQuestion + 1} of {quizData.questions.length}
          </div>

          {currentQuestion === quizData.questions.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={answers[currentQuestion] === null || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? "Submitting..." : "Submit Quiz"}
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              disabled={answers[currentQuestion] === null}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
