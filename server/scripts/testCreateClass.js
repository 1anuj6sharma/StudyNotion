const mongoose = require('mongoose');
const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const Course = require('../models/Course');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test creating a live class directly
const testCreateClass = async () => {
  try {
    console.log('Testing live class creation...');
    
    // Find an instructor and course for testing
    const instructor = await User.findOne({ accountType: 'Instructor' });
    const course = await Course.findOne();
    
    if (!instructor) {
      console.log('No instructor found in database');
      return;
    }
    
    if (!course) {
      console.log('No course found in database');
      return;
    }
    
    console.log(`Using instructor: ${instructor.firstName} ${instructor.lastName}`);
    console.log(`Using course: ${course.courseName}`);
    
    // Create test data
    const roomId = uuidv4();
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + 1); // 1 hour from now
    
    const classData = {
      title: 'Test Live Class',
      description: 'This is a test live class created by script',
      instructor: instructor._id,
      course: course._id,
      scheduledAt: scheduledTime,
      duration: 60,
      roomId,
      meetingUrl: `http://localhost:3000/live-class/${roomId}`,
      maxAttendees: 100,
      isRecorded: false,
      chatEnabled: true,
      screenShareEnabled: true,
      status: 'scheduled'
    };
    
    console.log('Creating live class with data:', JSON.stringify(classData, null, 2));
    
    const newClass = new LiveClass(classData);
    await newClass.save();
    
    console.log('✅ Live class created successfully!');
    console.log('Class ID:', newClass._id);
    
    // Verify it was saved
    const savedClass = await LiveClass.findById(newClass._id)
      .populate('instructor', 'firstName lastName')
      .populate('course', 'courseName');
    
    console.log('✅ Verified - Class found in database:');
    console.log(`- Title: ${savedClass.title}`);
    console.log(`- Instructor: ${savedClass.instructor.firstName} ${savedClass.instructor.lastName}`);
    console.log(`- Course: ${savedClass.course.courseName}`);
    console.log(`- Status: ${savedClass.status}`);
    console.log(`- Meeting URL: ${savedClass.meetingUrl}`);
    
  } catch (error) {
    console.error('Error creating test class:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testCreateClass();
};

runTest();
