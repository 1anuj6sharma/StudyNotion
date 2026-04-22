import { apiConnector } from "../apiconnector";
import { toast } from "react-hot-toast";

// Quiz API endpoints
const CREATE_QUIZ_API = "/quiz/create";
const GET_QUIZ_API = "/quiz/subsection";
const GET_QUIZ_FOR_INSTRUCTOR_API = "/quiz/instructor/subsection";
const SUBMIT_QUIZ_API = "/quiz/submit";
const UPDATE_QUIZ_API = "/quiz/update";
const DELETE_QUIZ_API = "/quiz/delete";
const GET_COURSE_QUIZZES_API = "/quiz/course";

// Create a new quiz
export const createQuiz = async (data, token) => {
  let result = null;
  const toastId = toast.loading("Creating quiz...");
  
  try {
    const response = await apiConnector("POST", CREATE_QUIZ_API, data, {
      Authorization: `Bearer ${token}`,
    });

    console.log("CREATE_QUIZ_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Create Quiz");
    }

    toast.success("Quiz Created Successfully");
    toast.dismiss(toastId);
    result = response?.data?.data;
  } catch (error) {
    console.log("CREATE_QUIZ_API ERROR............", error);
    toast.error(error.response?.data?.message || "Failed to create quiz");
    toast.dismiss(toastId);
  }
  return result;
};

// Get quiz for student
export const getQuiz = async (subsectionId, token) => {
  let result = null;
  
  try {
    const response = await apiConnector("GET", `${GET_QUIZ_API}/${subsectionId}`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_QUIZ_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Get Quiz");
    }

    result = response?.data?.data;
  } catch (error) {
    console.log("GET_QUIZ_API ERROR............", error);
    // Don't show toast for this error as it's expected when no quiz exists
    throw error;
  }
  return result;
};

// Get quiz for instructor (with answers and attempts)
export const getQuizForInstructor = async (subsectionId, token) => {
  let result = null;
  
  try {
    const response = await apiConnector("GET", `${GET_QUIZ_FOR_INSTRUCTOR_API}/${subsectionId}`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_QUIZ_FOR_INSTRUCTOR_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Get Quiz");
    }

    result = response?.data?.data;
  } catch (error) {
    console.log("GET_QUIZ_FOR_INSTRUCTOR_API ERROR............", error);
    throw error;
  }
  return result;
};

// Submit quiz
export const submitQuiz = async (subsectionId, answers, token) => {
  let result = null;
  const toastId = toast.loading("Submitting quiz...");
  
  try {
    const response = await apiConnector("POST", `${SUBMIT_QUIZ_API}/${subsectionId}`, {
      answers
    }, {
      Authorization: `Bearer ${token}`,
    });

    console.log("SUBMIT_QUIZ_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Could Not Submit Quiz");
    }

    toast.success(response?.data?.message || "Quiz submitted successfully");
    toast.dismiss(toastId);
    result = response?.data?.data;
  } catch (error) {
    console.log("SUBMIT_QUIZ_API ERROR............", error);
    toast.error(error.response?.data?.message || "Failed to submit quiz");
    toast.dismiss(toastId);
  }
  return result;
};

// Update quiz
export const updateQuiz = async (data, token) => {
  let result = null;
  const toastId = toast.loading("Updating quiz...");
  
  try {
    const response = await apiConnector("PUT", UPDATE_QUIZ_API, data, {
      Authorization: `Bearer ${token}`,
    });

    console.log("UPDATE_QUIZ_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Update Quiz");
    }

    toast.success("Quiz Updated Successfully");
    toast.dismiss(toastId);
    result = response?.data?.data;
  } catch (error) {
    console.log("UPDATE_QUIZ_API ERROR............", error);
    toast.error(error.response?.data?.message || "Failed to update quiz");
    toast.dismiss(toastId);
  }
  return result;
};

// Delete quiz
export const deleteQuiz = async (subsectionId, token) => {
  let result = null;
  const toastId = toast.loading("Deleting quiz...");
  
  try {
    const response = await apiConnector("DELETE", `${DELETE_QUIZ_API}/${subsectionId}`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("DELETE_QUIZ_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Delete Quiz");
    }

    toast.success("Quiz Deleted Successfully");
    toast.dismiss(toastId);
    result = response?.data?.data;
  } catch (error) {
    console.log("DELETE_QUIZ_API ERROR............", error);
    toast.error(error.response?.data?.message || "Failed to delete quiz");
    toast.dismiss(toastId);
  }
  return result;
};

// Get all quizzes for a course
export const getCourseQuizzes = async (courseId, token) => {
  let result = null;
  
  try {
    const response = await apiConnector("GET", `${GET_COURSE_QUIZZES_API}/${courseId}`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_COURSE_QUIZZES_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Get Course Quizzes");
    }

    result = response?.data?.data;
  } catch (error) {
    console.log("GET_COURSE_QUIZZES_API ERROR............", error);
    toast.error(error.response?.data?.message || "Failed to fetch course quizzes");
  }
  return result;
};
