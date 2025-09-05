import axios from "axios";
import { toast } from "react-hot-toast";

// Helper function to get the base URL
const getBaseUrl = () => {
  // Use REACT_APP_API_URL if set, otherwise use REACT_APP_BASE_URL, otherwise use defaults
  return process.env.REACT_APP_API_URL || 
         process.env.REACT_APP_BASE_URL ||
         (process.env.NODE_ENV === 'production'
           ? 'https://your-backend-api.vercel.app/api/v1'
           : 'http://localhost:4000/api/v1');
};

// Create axios instance with default config
export const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 60000, // 60 seconds timeout
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
