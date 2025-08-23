const mongoose = require('mongoose');
require('dotenv').config();

async function inspectReview() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB');
    
    const review = await mongoose.connection.db.collection('ratingandreviews').findOne({});
    
    if (!review) {
      console.log('ℹ️ No reviews found in the database');
      process.exit(0);
    }
    
    console.log('\n📝 Review document:');
    console.log(JSON.stringify(review, null, 2));
    
    // Check if user reference exists
    if (review.user) {
      console.log('\n🔍 Checking user reference...');
      const user = await mongoose.connection.db.collection('users').findOne({ _id: review.user });
      console.log('User details:', user ? {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      } : 'User not found');
    }
    
    // Check if course reference exists
    if (review.course) {
      console.log('\n🔍 Checking course reference...');
      const course = await mongoose.connection.db.collection('courses').findOne({ _id: review.course });
      console.log('Course details:', course ? {
        _id: course._id,
        courseName: course.courseName
      } : 'Course not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inspectReview();
