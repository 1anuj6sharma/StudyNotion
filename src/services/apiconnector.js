import axios from "axios";
import { toast } from "react-hot-toast";

// Helper function to get the base URL
const getBaseUrl = () => {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // If REACT_APP_BASE_URL is set, use it, otherwise use the default
  return process.env.REACT_APP_BASE_URL || 
    (isDevelopment 
      ? 'http://localhost:4000/api/v1' 
      : 'https://studynotion-backend-g7ip.onrender.com/api/v1');
};

// Create axios instance with default config
export const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 300000, // 5 minutes timeout (300 seconds) for large file uploads
  headers: {
    // Don't set Content-Type here - let interceptor handle it
    "Accept": "application/json",
  },
  withCredentials: true,
  validateStatus: function (status) {
    // Consider status codes less than 500 as success
    return status < 500;
  }
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      data: config.data,
      params: config.params,
      headers: config.headers
    });

    // Add auth token if exists
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // IMPORTANT: If data is FormData, let the browser set Content-Type automatically
    // The browser will set it to multipart/form-data with the correct boundary
    if (config.data instanceof FormData) {
      // Remove Content-Type to let browser set it with boundary
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      // Only set JSON content type for non-FormData requests
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} ${response.config.url}`, {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error('[API] Response error:', {
      message: error.message,
      config: error.config,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      toast.error("Request timeout. Please try again.");
    } else if (!error.response) {
      toast.error("Network Error: Please check your internet connection");
    } else {
      // Only show error toast for server errors (500+)
      if (error.response.status >= 500) {
        toast.error("Server error. Please try again later.");
      }
      
      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Handle unauthorized access
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;
        case 403:
          toast.error("You don't have permission to perform this action.");
          break;
        case 404:
          // Don't show toast for 404, handle it in the component
          break;
        case 422:
          // Validation errors will be handled by the form
          break;
        default:
          // Other client errors (400-499)
          if (error.response.status < 500) {
            const errorMessage = error.response.data?.message || "An error occurred";
            toast.error(errorMessage);
          }
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * API Connector function to make HTTP requests
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {string} url - API endpoint URL
 * @param {object} bodyData - Request body data (for POST, PUT, PATCH)
 * @param {object} headers - Additional headers
 * @param {object} params - URL parameters
 * @returns {Promise} - Axios response
 */
export const apiConnector = async (method, url, bodyData, headers, params) => {
  try {
    const requestConfig = {
      method: method.toUpperCase(),
      url: url,
      headers: headers || {},
      params: params || {},
    };

    // Only include data for methods that typically have a body
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      requestConfig.data = bodyData; // Send data directly, not wrapped in a 'data' property
    }

    console.log(`[API] ${method} ${url} Request:`, {
      data: bodyData,
      params: requestConfig.params,
      headers: requestConfig.headers
    });

    const response = await axiosInstance(requestConfig);
    console.log(`[API] ${method} ${url} Response:`, response);
    return response;
  } catch (error) {
    console.error(`[API] ${method} ${url} Error:`, error);
    
    // Handle network errors
    if (!error.response) {
      throw {
        response: {
          status: 500,
          data: {
            success: false,
            message: 'Network error. Please check your connection and try again.'
          }
        }
      };
    }
    
    // Log the error details
    console.error(`[API] ${method} ${url} Error Details:`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    // Rethrow the error to be handled by the calling function
    throw error;
  }
};
