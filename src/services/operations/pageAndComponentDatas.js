import { toast } from "react-hot-toast"

import { apiConnector } from "../apiconnector"
import { courseEndpoints } from "../apis"

/**
 * Fetches catalog page data for a specific category
 * @param {string} categoryId - The ID of the category to fetch data for
 * @returns {Promise<Object>} - The catalog page data
 */
export const getCatalogPageData = async (categoryId) => {
  const toastId = toast.loading("Loading category data...");
  let result = { success: false, data: null };
  
  console.log('[getCatalogPageData] Fetching data for category ID:', categoryId);
  
  try {
    // Validate input
    if (!categoryId) {
      throw new Error("Category ID is required");
    }
    
    if (typeof categoryId !== 'string') {
      console.warn('Category ID is not a string, converting...', { categoryId });
      categoryId = String(categoryId).trim();
    }
    
    // Make the API request
    const response = await apiConnector(
      "POST",
      courseEndpoints.GET_CATEGORY_PAGE_DETAILS,
      { categoryId },
      { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      null, // params
      { timeout: 15000 } // 15 seconds timeout
    );
    
    console.log('Full API response:', response);
    
    console.log('[getCatalogPageData] API response:', {
      status: response.status,
      success: response.data?.success,
      data: response.data ? 'Received data' : 'No data'
    });
    
    // Handle non-200 responses
    if (response.status >= 400) {
      throw new Error(
        response.data?.message || 
        `Request failed with status ${response.status}`
      );
    }
    
    // Check if we got valid data
    if (!response.data) {
      throw new Error("No data received from the server");
    }
    
    // Check if the request was successful
    if (!response.data.success) {
      throw new Error(
        response.data.message || 
        "Failed to fetch category page data"
      );
    }
    
    // Return the successful response
    result = {
      success: true,
      data: response.data.data,
      message: response.data.message
    };
    
  } catch (error) {
    console.error('[getCatalogPageData] Error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    
    // Determine the error message to show
    let errorMessage = "Failed to load category data";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Only show toast for non-404 errors
    if (error.response?.status !== 404) {
      toast.error(errorMessage);
    }
    
    // Set the error result
    result = {
      success: false,
      error: errorMessage,
      status: error.response?.status,
      ...(error.response?.data || {})
    };
    
  } finally {
    toast.dismiss(toastId);
  }
  
  return result;
};
