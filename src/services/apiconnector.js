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
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
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
    
    // Ensure we always have a content type
    if (!config.headers['Content-Type']) {
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
    const response = await axiosInstance({
      method: method,
      url: url,
      data: bodyData,
      headers: {
        ...(headers || {}),
      },
      params: params || {},
    });
    
    return response;
  } catch (error) {
    console.error("API Error:", {
      url,
      method,
      error: error.response?.data || error.message,
    });
    
    // Rethrow the error to be handled by the calling function
    throw error;
  }
};
