import axios from "axios";
import { toast } from "react-hot-toast";

// Create axios instance with default config
export const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BASE_URL || "https://studynotion-backend-g7ip.onrender.com/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if exists
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      toast.error("Network Error: Please check your internet connection");
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

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
