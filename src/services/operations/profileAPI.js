import { toast } from "react-hot-toast"

import { setLoading, setUser } from "../../slices/profileSlice"
import { apiConnector } from "../apiconnector"
import { profileEndpoints } from "../apis"
import { logout } from "./authAPI"

const {
  GET_USER_DETAILS_API,
  GET_USER_ENROLLED_COURSES_API,
  GET_INSTRUCTOR_DATA_API,
} = profileEndpoints

export function getUserDetails(token, navigate) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...")
    dispatch(setLoading(true))
    try {
      const response = await apiConnector("GET", GET_USER_DETAILS_API, null, {
        Authorization: `Bearer ${token}`,
      })
      console.log("GET_USER_DETAILS API RESPONSE............", response)

      if (!response.data.success) {
        throw new Error(response.data.message)
      }
      const userImage = response.data.data.image
        ? response.data.data.image
        : `https://api.dicebear.com/5.x/initials/svg?seed=${response.data.data.firstName} ${response.data.data.lastName}`
      dispatch(setUser({ ...response.data.data, image: userImage }))
    } catch (error) {
      dispatch(logout(navigate))
      console.log("GET_USER_DETAILS API ERROR............", error)
      toast.error("Could Not Get User Details")
    }
    toast.dismiss(toastId)
    dispatch(setLoading(false))
  }
}

export async function getUserEnrolledCourses(token) {
  if (!token) {
    console.error("No token provided for fetching enrolled courses")
    toast.error("Authentication required. Please log in again.")
    return []
  }

  const toastId = toast.loading("Fetching your enrolled courses...")
  let result = []
  
  try {
    console.log("Fetching enrolled courses from:", GET_USER_ENROLLED_COURSES_API)
    const response = await apiConnector(
      "GET",
      GET_USER_ENROLLED_COURSES_API,
      null,
      {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    )

    console.log("GET_USER_ENROLLED_COURSES_API API RESPONSE:", response)

    if (!response?.data?.success) {
      const errorMsg = response?.data?.message || "Failed to fetch enrolled courses"
      console.error("API Error Response:", response.data)
      throw new Error(errorMsg)
    }
    
    result = response.data.data || []
    console.log("Successfully fetched", result.length, "enrolled courses")
    
  } catch (error) {
    console.error("GET_USER_ENROLLED_COURSES_API API ERROR:", error)
    
    // More specific error messages based on error type
    let errorMessage = "Could not load enrolled courses"
    if (error.response) {
      // Server responded with error status code (4xx, 5xx)
      if (error.response.status === 401) {
        errorMessage = "Session expired. Please log in again."
      } else if (error.response.status === 404) {
        errorMessage = "Enrollment data not found"
      } else if (error.response.status >= 500) {
        errorMessage = "Server error. Please try again later."
      }
      console.error("Error response data:", error.response.data)
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = "No response from server. Please check your connection."
      console.error("No response received:", error.request)
    }
    
    toast.error(errorMessage)
    throw error // Re-throw to allow handling in the component
  } finally {
    toast.dismiss(toastId)
  }
  
  return result
}

export async function getInstructorData(token) {
  const toastId = toast.loading("Loading...")
  let result = []
  try {
    const response = await apiConnector("GET", GET_INSTRUCTOR_DATA_API, null, {
      Authorization: `Bearer ${token}`,
    })
    console.log("GET_INSTRUCTOR_DATA_API API RESPONSE............", response)
    result = response?.data?.courses
  } catch (error) {
    console.log("GET_INSTRUCTOR_DATA_API API ERROR............", error)
    toast.error("Could Not Get Instructor Data")
  }
  toast.dismiss(toastId)
  return result
}
