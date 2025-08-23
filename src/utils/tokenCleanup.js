// Utility to clean up corrupted tokens from localStorage
export const cleanupToken = () => {
  const token = localStorage.getItem("token")
  
  if (!token) return null
  
  try {
    // If it's a JSON string, parse it and store the actual token
    const parsed = JSON.parse(token)
    if (typeof parsed === 'string') {
      localStorage.setItem("token", parsed)
      console.log("Token migrated from JSON format to string format")
      return parsed
    } else {
      // Invalid token format, remove it
      localStorage.removeItem("token")
      console.log("Invalid token format removed")
      return null
    }
  } catch (error) {
    // It's not JSON, which is correct for JWT tokens
    console.log("Token is in correct format")
    return token
  }
}

// Function to completely clear authentication data
export const clearAuthData = () => {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  console.log("Authentication data cleared")
}
