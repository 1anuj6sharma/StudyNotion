import { toast } from "react-hot-toast";
import { apiConnector } from "../apiconnector";
import { liveClassEndpoints } from "../apis";

const {
  CREATE_LIVE_CLASS_API,
  GET_UPCOMING_CLASSES_API,
  GET_COURSE_CLASSES_API,
  JOIN_LIVE_CLASS_API,
  LEAVE_LIVE_CLASS_API,
  GET_LIVE_CLASS_API,
  GET_LIVE_CLASS_BY_ROOM_API,
  GET_INSTRUCTOR_CLASSES_API,
  DELETE_LIVE_CLASS_API,
  UPDATE_CLASS_STATUS_API,
  UPDATE_PARTICIPANT_STATUS_API
} = liveClassEndpoints;

// Create a new live class (Instructor only)
export async function createLiveClass(data, token) {
  const toastId = toast.loading("Creating Live Class...");
  try {
    console.log('Creating live class with data:', data);
    
    // Ensure we have a valid token
    if (!token) {
      throw new Error("Authentication token is missing");
    }

    // Prepare the request
    const requestData = {
      ...data,
      scheduledTime: data.scheduledTime || new Date().toISOString(),
      scheduledAt: data.scheduledAt || new Date().toISOString(),
    };

    console.log('Sending request to:', CREATE_LIVE_CLASS_API);
    const response = await apiConnector(
      "POST", 
      CREATE_LIVE_CLASS_API, 
      requestData,
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    );

    console.log('API Response:', response);

    if (!response) {
      throw new Error("No response received from server");
    }

    // Handle different response statuses
    if (response.status === 401) {
      throw new Error("Authentication failed. Please log in again.");
    }

    if (response.status === 400) {
      const errorMsg = response.data?.message || "Invalid request data";
      throw new Error(errorMsg);
    }

    if (response.status === 500) {
      throw new Error("Server error. Please try again later.");
    }

    if (!response.data || !response.data.success) {
      const errorMsg = response.data?.message || "Failed to create live class";
      throw new Error(errorMsg);
    }

    toast.success("Live Class Created Successfully!");
    return response.data.liveClass || response.data;
  } catch (error) {
    console.error("CREATE_LIVE_CLASS_API ERROR:", error);
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        "An error occurred while creating the live class";
    
    toast.error(errorMessage);
    throw error;
  } finally {
    toast.dismiss(toastId);
  }
}

// Get all upcoming live classes
export async function getUpcomingClasses(token) {
  const toastId = toast.loading("Loading...");
  try {
    const response = await apiConnector("GET", GET_UPCOMING_CLASSES_API, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_UPCOMING_CLASSES_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Upcoming Classes");
    }

    toast.dismiss(toastId);
    return response.data.classes;
  } catch (error) {
    console.log("GET_UPCOMING_CLASSES_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Fetch Classes");
    toast.dismiss(toastId);
    throw error;
  }
}

// Get live classes for a specific course
export function getCourseClasses(courseId) {
  return async (dispatch) => {
    const toastId = toast.loading("Loading...");
    try {
      const response = await apiConnector("GET", GET_COURSE_CLASSES_API.replace(":courseId", courseId));

      console.log("GET_COURSE_CLASSES_API RESPONSE............", response);

      if (!response?.data?.success) {
        throw new Error("Could Not Fetch Course Classes");
      }

      toast.dismiss(toastId);
      return response.data.classes;
    } catch (error) {
      console.log("GET_COURSE_CLASSES_API ERROR............", error);
      toast.error(error.response?.data?.message || "Could Not Fetch Course Classes");
      toast.dismiss(toastId);
    }
  };
}

// Join a live class (Redux thunk version)
export function joinLiveClass(classId, token) {
  return async (dispatch) => {
    const toastId = toast.loading("Joining Live Class...");
    try {
      const response = await apiConnector("POST", JOIN_LIVE_CLASS_API.replace(":classId", classId), {}, {
        Authorization: `Bearer ${token}`,
      });

      console.log("JOIN_LIVE_CLASS_API RESPONSE............", response);

      if (!response?.data?.success) {
        throw new Error("Could Not Join Live Class");
      }

      toast.success("Successfully Joined Live Class");
      toast.dismiss(toastId);
      return response.data;
    } catch (error) {
      console.log("JOIN_LIVE_CLASS_API ERROR............", error);
      toast.error(error.response?.data?.message || "Could Not Join Live Class");
      toast.dismiss(toastId);
    }
  };
}

// Join a live class (Direct async function for components)
export async function joinLiveClassDirect(classId, token) {
  const toastId = toast.loading("Joining Live Class...");
  try {
    const response = await apiConnector("POST", JOIN_LIVE_CLASS_API.replace(":classId", classId), {}, {
      Authorization: `Bearer ${token}`,
    });

    console.log("JOIN_LIVE_CLASS_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Join Live Class");
    }

    toast.success("Successfully Joined Live Class");
    toast.dismiss(toastId);
    return response.data;
  } catch (error) {
    console.log("JOIN_LIVE_CLASS_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Join Live Class");
    toast.dismiss(toastId);
    throw error;
  }
}

// Leave a live class (Redux thunk version)
export function leaveLiveClass(classId, token) {
  return async (dispatch) => {
    try {
      const response = await apiConnector("POST", LEAVE_LIVE_CLASS_API.replace(":classId", classId), {}, {
        Authorization: `Bearer ${token}`,
      });

      console.log("LEAVE_LIVE_CLASS_API RESPONSE............", response);

      if (!response?.data?.success) {
        throw new Error("Could Not Leave Live Class");
      }

      toast.success("Left Live Class Successfully");
      return response.data;
    } catch (error) {
      console.log("LEAVE_LIVE_CLASS_API ERROR............", error);
      toast.error(error.response?.data?.message || "Could Not Leave Live Class");
    }
  };
}

// Leave a live class (Direct async function for components)
export async function leaveLiveClassDirect(classId, token) {
  try {
    const response = await apiConnector("POST", LEAVE_LIVE_CLASS_API.replace(":classId", classId), {}, {
      Authorization: `Bearer ${token}`,
    });

    console.log("LEAVE_LIVE_CLASS_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Leave Live Class");
    }

    toast.success("Successfully Left Live Class");
    return response.data;
  } catch (error) {
    console.log("LEAVE_LIVE_CLASS_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Leave Live Class");
    throw error;
  }
}

// Update live class status (Instructor only)
export async function updateClassStatus(classId, status, token) {
  const toastId = toast.loading("Updating class status...");
  try {
    const response = await apiConnector(
      "PUT",
      UPDATE_CLASS_STATUS_API.replace(":classId", classId),
      { status },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    console.log("UPDATE_CLASS_STATUS RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Update Class Status");
    }

    toast.success("Class status updated successfully");
    return response.data;
  } catch (error) {
    console.log("UPDATE_CLASS_STATUS ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Update Class Status");
    throw error;
  } finally {
    toast.dismiss(toastId);
  }
}

// Update participant status in a live class
export async function updateParticipantStatus(classId, status, token) {
  const toastId = toast.loading("Updating your status...");
  try {
    const response = await apiConnector(
      "PUT",
      UPDATE_PARTICIPANT_STATUS_API.replace(":classId", classId),
      { status },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    console.log("UPDATE_PARTICIPANT_STATUS_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could not update participant status");
    }

    toast.success("Status updated successfully");
    return response.data;
  } catch (error) {
    console.log("UPDATE_PARTICIPANT_STATUS_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could not update your status");
    throw error;
  } finally {
    toast.dismiss(toastId);
  }
}

// Get live class details
export async function getLiveClassDetails(classId, token) {
  const toastId = toast.loading("Loading Live Class Details...");
  try {
    const response = await apiConnector("GET", `${GET_LIVE_CLASS_API.replace(':classId', classId)}`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_LIVE_CLASS_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Live Class Details");
    }

    toast.dismiss(toastId);
    return response.data.liveClass;
  } catch (error) {
    console.log("GET_LIVE_CLASS_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Fetch Live Class Details");
    toast.dismiss(toastId);
    throw error;
  }
}

// Get live class details by roomId
export async function getLiveClassByRoomId(roomId, token) {
  const toastId = toast.loading("Loading Live Class Details...");
  try {
    const response = await apiConnector("GET", `${GET_LIVE_CLASS_BY_ROOM_API.replace(':roomId', roomId)}`, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_LIVE_CLASS_BY_ROOM_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Live Class Details");
    }

    toast.dismiss(toastId);
    return response.data.liveClass;
  } catch (error) {
    console.log("GET_LIVE_CLASS_BY_ROOM_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Fetch Live Class Details");
    toast.dismiss(toastId);
    throw error;
  }
}

// Get instructor's live classes
export async function getInstructorClasses(token) {
  const toastId = toast.loading("Loading...");
  try {
    const response = await apiConnector("GET", GET_INSTRUCTOR_CLASSES_API, null, {
      Authorization: `Bearer ${token}`,
    });

    console.log("GET_INSTRUCTOR_CLASSES_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Fetch Instructor Classes");
    }

    toast.dismiss(toastId);
    return response.data.classes;
  } catch (error) {
    console.log("GET_INSTRUCTOR_CLASSES_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Fetch Instructor Classes");
    toast.dismiss(toastId);
    throw error;
  }
}

// Start a live class (Instructor only)
export async function startLiveClass(classId, token) {
  const toastId = toast.loading("Starting Live Class...");
  try {
    // Use the update status endpoint with status 'started'
    const response = await apiConnector(
      "PUT",
      UPDATE_CLASS_STATUS_API.replace(":classId", classId),
      { status: 'started' },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    console.log("START_LIVE_CLASS_API RESPONSE............", response);

    if (!response?.data?.success) {
      throw new Error("Could Not Start Live Class");
    }

    toast.success("Live Class Started Successfully");
    toast.dismiss(toastId);
    return response.data;
  } catch (error) {
    console.log("START_LIVE_CLASS_API ERROR............", error);
    toast.error(error.response?.data?.message || "Could Not Start Live Class");
    toast.dismiss(toastId);
    throw error;
  }
}

// Delete a live class (Instructor only)
export async function deleteLiveClass(classId, token) {
  const functionStart = performance.now();
  console.log('\n=== FRONTEND: DELETE_LIVE_CLASS called ===');
  console.log('Class ID:', classId);
  console.log('Token exists:', !!token);
  
  if (!classId) {
    const error = new Error('Class ID is required');
    console.error('Validation error:', error);
    throw error;
  }

  const toastId = toast.loading("Deleting Live Class...");
  const url = DELETE_LIVE_CLASS_API.replace(':classId', classId);
  
  console.log('Request URL:', url);
  
  try {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('Request Headers:', headers);
    console.log('Sending DELETE request...');
    
    const startTime = performance.now();
    
    // Using fetch directly for better control
    const response = await fetch(url, {
      method: 'DELETE',
      headers: headers,
      credentials: 'include',
      mode: 'cors'
    });
    
    const endTime = performance.now();
    console.log(`Request completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      responseData = {};
    }
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Data:', responseData);
    
    if (!response.ok) {
      const error = new Error(responseData.message || 'Failed to delete live class');
      error.response = response;
      error.status = response.status;
      throw error;
    }
    
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to delete live class');
    }
    
    console.log('Delete successful');
    toast.success("Live Class Deleted Successfully");
    return responseData;
    
  } catch (error) {
    console.error('=== DELETE_LIVE_CLASS ERROR ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      status: error.status,
      response: error.response,
      stack: error.stack
    });
    
    let errorMessage = 'Failed to delete live class. ';
    
    if (error.message.includes('Network Error')) {
      errorMessage += 'Please check your internet connection.';
    } else if (error.status === 401) {
      errorMessage = 'Session expired. Please log in again.';
    } else if (error.status === 403) {
      errorMessage = 'You do not have permission to delete this class.';
    } else if (error.status === 404) {
      errorMessage = 'Live class not found or already deleted.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    toast.error(errorMessage);
    throw error;
    
  } finally {
    const functionEnd = performance.now();
    console.log(`Total function execution time: ${(functionEnd - functionStart).toFixed(2)}ms`);
    toast.dismiss(toastId);
  }
}
