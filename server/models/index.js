const mongoose = require('mongoose');

// Import all models
require('./Category');
require('./Course');
require('./CourseAnalytics');
require('./CourseProgress');
require('./LiveClass');
require('./OTP');
require('./Profile');
require('./RatingAndReview');
require('./Section');
require('./SubSection');
require('./User');

// Export mongoose instance and models
module.exports = {
  mongoose,
  Category: mongoose.models.category || mongoose.model('category', require('./Category').schema),
  Course: mongoose.models.course || mongoose.model('course', require('./Course').schema),
  CourseAnalytics: mongoose.models.courseAnalytics || mongoose.model('courseAnalytics', require('./CourseAnalytics').schema),
  CourseProgress: mongoose.models.courseProgress || mongoose.model('courseProgress', require('./CourseProgress').schema),
  LiveClass: mongoose.models.liveClass || mongoose.model('liveClass', require('./LiveClass').schema),
  OTP: mongoose.models.otp || mongoose.model('otp', require('./OTP').schema),
  Profile: mongoose.models.profile || mongoose.model('profile', require('./Profile').schema),
  RatingAndReview: mongoose.models.ratingAndReview || mongoose.model('ratingAndReview', require('./RatingAndReview').schema),
  Section: mongoose.models.section || mongoose.model('section', require('./Section').schema),
  SubSection: mongoose.models.subSection || mongoose.model('subSection', require('./SubSection').schema),
  User: mongoose.models.user || mongoose.model('user', require('./User').schema)
};
