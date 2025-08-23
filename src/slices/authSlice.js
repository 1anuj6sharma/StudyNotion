import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  signupData: null,
  loading: false,
  token: (() => {
    const token = localStorage.getItem("token")
    if (!token) return null
    
    try {
      // If it's a JSON string, parse it and store the actual token
      const parsed = JSON.parse(token)
      if (typeof parsed === 'string') {
        localStorage.setItem("token", parsed)
        return parsed
      } else {
        // Invalid token format, remove it
        localStorage.removeItem("token")
        return null
      }
    } catch (error) {
      // It's not JSON, which is correct for JWT tokens
      return token
    }
  })(),
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    setSignupData(state, value) {
      state.signupData = value.payload;
    },
    setLoading(state, value) {
      state.loading = value.payload;
    },
    setToken(state, value) {
      state.token = value.payload;
    },
  },
});

export const { setSignupData, setLoading, setToken } = authSlice.actions;

export default authSlice.reducer;
