let BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:4000';

// Remove trailing slash from base URL to prevent URL duplication
if (BASE_URL.endsWith('/')) {
  BASE_URL = BASE_URL.slice(0, -1);
}

// AUTH ENDPOINTS
export const endpoints = {
  SENDOTP_API: `${BASE_URL}/auth/sendotp`,
  SIGNUP_API: `${BASE_URL}/auth/signup`,
  LOGIN_API: `${BASE_URL}/auth/login`,
  RESETPASSTOKEN_API: `${BASE_URL}/auth/reset-password-token`,
  RESETPASSWORD_API: `${BASE_URL}/auth/reset-password`,
}

// PROFILE ENDPOINTS
export const profileEndpoints = {
  GET_USER_DETAILS_API: BASE_URL + "/profile/getUserDetails",
  GET_USER_ENROLLED_COURSES_API: BASE_URL + "/profile/getEnrolledCourses",
  GET_INSTRUCTOR_DATA_API: BASE_URL + "/profile/instructorDashboard",
}

// STUDENTS ENDPOINTS
export const studentEndpoints = {
  COURSE_PAYMENT_API: BASE_URL + "/payment/capturePayment",
  COURSE_VERIFY_API: BASE_URL + "/payment/verifyPayment",
  SEND_PAYMENT_SUCCESS_EMAIL_API: BASE_URL + "/payment/sendPaymentSuccessEmail",
}

// COURSE ENDPOINTS
export const courseEndpoints = {
  GET_ALL_COURSE_API: BASE_URL + "/course/getAllCourses",
  COURSE_DETAILS_API: BASE_URL + "/course/getCourseDetails",
  EDIT_COURSE_API: BASE_URL + "/course/editCourse",
  COURSE_CATEGORIES_API: BASE_URL + "/course/showAllCategories",
  CREATE_COURSE_API: BASE_URL + "/course/createCourse",
  CREATE_SECTION_API: BASE_URL + "/course/addSection",
  CREATE_SUBSECTION_API: BASE_URL + "/course/addSubSection",
  UPDATE_SECTION_API: BASE_URL + "/course/updateSection",
  UPDATE_SUBSECTION_API: BASE_URL + "/course/updateSubSection",
  GET_ALL_INSTRUCTOR_COURSES_API: BASE_URL + "/course/getInstructorCourses",
  DELETE_SECTION_API: BASE_URL + "/course/deleteSection",
  DELETE_SUBSECTION_API: BASE_URL + "/course/deleteSubSection",
  DELETE_COURSE_API: BASE_URL + "/course/deleteCourse",
  GET_FULL_COURSE_DETAILS_AUTHENTICATED:
    BASE_URL + "/course/getFullCourseDetails",
  LECTURE_COMPLETION_API: BASE_URL + "/course/updateCourseProgress",
  CREATE_RATING_API: BASE_URL + "/course/createRating",
  GET_CATEGORY_PAGE_DETAILS: BASE_URL + "/course/getCategoryPageDetails",
}

// RATINGS AND REVIEWS
export const ratingsEndpoints = {
  REVIEWS_DETAILS_API: BASE_URL + "/course/getReviews",
}

// AI CHATBOT ENDPOINTS
export const aiChatbotEndpoints = {
  GET_AI_RECOMMENDATIONS: BASE_URL + '/ai-chatbot/recommendations',
}

// CATAGORIES API
export const categories = {
  CATEGORIES_API: BASE_URL + "/course/showAllCategories",
  CREATE_CATEGORY_API: BASE_URL +  "/course/createCategory",
}

// CATALOG PAGE DATA
export const catalogData = {
  CATALOGPAGEDATA_API: BASE_URL + "/course/getCategoryPageDetails",
}
// CONTACT-US API
export const contactusEndpoint = {
  CONTACT_US_API: BASE_URL + "/reach/contact",
}

// SETTINGS PAGE API
export const settingsEndpoints = {
  UPDATE_DISPLAY_PICTURE_API: BASE_URL + "/profile/updateDisplayPicture",
  UPDATE_PROFILE_API: BASE_URL + "/profile/updateProfile",
  CHANGE_PASSWORD_API: BASE_URL + "/auth/changepassword",
  DELETE_PROFILE_API: BASE_URL + "/profile/deleteProfile",
}

// LIVE CLASS ENDPOINTS
export const liveClassEndpoints = {
  DELETE_LIVE_CLASS_API: BASE_URL + "/live-class/:classId",
  UPDATE_PARTICIPANT_STATUS_API: BASE_URL + "/live-class/:classId/update-participant-status",
  CREATE_LIVE_CLASS_API: BASE_URL + "/live-class/create",
  GET_UPCOMING_CLASSES_API: BASE_URL + "/live-class/upcoming",
  GET_COURSE_CLASSES_API: BASE_URL + "/live-class/course/:courseId",
  JOIN_LIVE_CLASS_API: BASE_URL + "/live-class/join/:classId",
  LEAVE_LIVE_CLASS_API: BASE_URL + "/live-class/leave/:classId",
  GET_LIVE_CLASS_API: BASE_URL + "/live-class/:classId",
  GET_LIVE_CLASS_BY_ROOM_API: BASE_URL + "/live-class/room/:roomId",
  UPDATE_CLASS_STATUS_API: BASE_URL + "/live-class/:classId/status",
  GET_INSTRUCTOR_CLASSES_API: BASE_URL + "/live-class/instructor/my-classes",
  START_LIVE_CLASS_API: BASE_URL + "/live-class/:classId/start",
  TEST_CREATE_LIVE_CLASS_API: BASE_URL + "/live-class/test-create",
}
