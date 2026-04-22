import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { RxCross2 } from "react-icons/rx";
import { createQuiz, updateQuiz, deleteQuiz } from "../../../../services/operations/quizAPI";

const QuizCreationModal = ({ 
  isOpen, 
  onClose, 
  subsectionId, 
  courseId, 
  existingQuiz = null,
  onQuizCreated,
  onSubSectionModalClose
}) => {
  console.log("QuizCreationModal received subsectionId:", subsectionId);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([
    { question: "", options: ["", ""], correctAnswer: 0 }
  ]);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      title: existingQuiz?.title || "",
      description: existingQuiz?.description || "",
      passingScore: existingQuiz?.passingScore || 3,
      timeLimit: existingQuiz?.timeLimit || 10
    }
  });

  useEffect(() => {
    if (existingQuiz) {
      setQuestions(existingQuiz.questions);
    }
  }, [existingQuiz]);

  const addQuestion = () => {
    if (questions.length < 5) {
      setQuestions([...questions, { question: "", options: ["", ""], correctAnswer: 0 }]);
    } else {
      toast.error("Maximum 5 questions allowed");
    }
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length < 4) {
      newQuestions[questionIndex].options.push("");
    } else {
      toast.error("Maximum 4 options allowed");
    }
  };

  const removeOption = (questionIndex, optionIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
        (_, i) => i !== optionIndex
      );
      // Adjust correctAnswer if necessary
      if (newQuestions[questionIndex].correctAnswer >= newQuestions[questionIndex].options.length) {
        newQuestions[questionIndex].correctAnswer = 0;
      }
    }
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  };

  const onSubmit = async (data) => {
    try {
      // Validate questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question.trim()) {
          toast.error(`Question ${i + 1} is required`);
          return;
        }
        if (q.options.filter(opt => opt.trim()).length < 2) {
          toast.error(`Question ${i + 1} must have at least 2 options`);
          return;
        }
      }

      setLoading(true);
      
      const quizData = {
        subsection: subsectionId,
        course: courseId,
        title: data.title,
        description: data.description,
        questions: questions.map(q => {
          console.log("Processing question:", q);
          return {
            question: q.question,
            options: q.options.filter(opt => opt.trim()),
            correctAnswer: q.correctAnswer
          };
        }),
        passingScore: data.passingScore,
        timeLimit: data.timeLimit
      };

      console.log("Quiz data being sent:", quizData);

      let result;
      if (existingQuiz) {
        result = await updateQuiz({ ...quizData, quizId: existingQuiz._id }, data.token);
      } else {
        result = await createQuiz(quizData, data.token);
      }

      if (result) {
        onQuizCreated && onQuizCreated(result);
        toast.success(existingQuiz ? "Quiz updated successfully!" : "Quiz created successfully!");
        onClose && onSubSectionModalClose();
        onClose();
      }
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast.error(error.message || "Failed to save quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!existingQuiz) return;
    
    if (window.confirm("Are you sure you want to delete this quiz?")) {
      try {
        setLoading(true);
        await deleteQuiz(subsectionId, existingQuiz.token);
        toast.success("Quiz deleted successfully!");
        onClose();
      } catch (error) {
        console.error("Error deleting quiz:", error);
        toast.error(error.message || "Failed to delete quiz");
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {existingQuiz ? "Edit Quiz" : "Create Quiz"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <RxCross2 size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Quiz Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quiz Title *
              </label>
              <input
                type="text"
                {...register("title", { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quiz title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register("description")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter quiz description (optional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Score (out of {questions.length})
                </label>
                <input
                  type="number"
                  {...register("passingScore", { 
                    required: true, 
                    min: 1, 
                    max: questions.length 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max={questions.length}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  {...register("timeLimit", { required: true, min: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Questions ({questions.length}/5)</h3>
              <button
                type="button"
                onClick={addQuestion}
                disabled={questions.length >= 5}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Add Question
              </button>
            </div>

            {questions.map((question, qIndex) => (
              <div key={qIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">Question {qIndex + 1}</h4>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text *
                  </label>
                  <textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Enter question"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Options *
                    </label>
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      disabled={question.options.length >= 4}
                      className="text-sm px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                    >
                      Add Option
                    </button>
                  </div>

                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.correctAnswer === oIndex}
                        onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Option ${oIndex + 1}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(qIndex, oIndex)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}

                  <p className="text-sm text-gray-500">
                    Select the radio button for the correct answer
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4">
            <div>
              {existingQuiz && (
                <button
                  type="button"
                  onClick={handleDeleteQuiz}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  Delete Quiz
                </button>
              )}
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? "Saving..." : (existingQuiz ? "Update Quiz" : "Create Quiz")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuizCreationModal;
