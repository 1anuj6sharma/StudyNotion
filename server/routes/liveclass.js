const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { auth, isInstructor, isStudent } = require('../middlewares/auth');

// Import models directly to ensure schemas are registered
const User = require('../models/User');
const Course = require('../models/Course');
const LiveClass = require('../models/LiveClass');

// Get the models from mongoose to ensure they're properly registered
const UserModel = mongoose.models.User || mongoose.model('User', User.schema);
const CourseModel = mongoose.models.Course || mongoose.model('Course', Course.schema);
const LiveClassModel = mongoose.models.LiveClass || mongoose.model('LiveClass', LiveClass.schema);

// Make sure to use LiveClassModel instead of LiveClass for all database operations

// Debug route to list all live classes
router.delete('/:classId', auth, isInstructor, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Find the live class
    const liveClass = await LiveClassModel.findById(classId);
    if (!liveClass) {
      return res.status(404).json({ success: false, message: 'Live class not found' });
    }

    // Check if the instructor owns the class
    if (liveClass.instructor && liveClass.instructor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this class' });
    }

    // Delete the class
    await LiveClassModel.findByIdAndDelete(classId);
    
    return res.status(200).json({ success: true, message: 'Live class deleted successfully' });
  } catch (error) {
    console.error('Error deleting live class:', error);
    return res.status(400).json({ success: false, message: 'Failed to delete live class' });
  }
});

// Debug route to list all live classes
router.get('/debug/all', async (req, res) => {
  try {
    const classes = await LiveClassModel.find({})
      .select('title meetingUrl roomId status scheduledAt instructor course')
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: classes.length,
      classes: classes.map(c => ({
        id: c._id,
        title: c.title,
        meetingUrl: c.meetingUrl,
        roomId: c.roomId,
        status: c.status,
        scheduledAt: c.scheduledAt,
        instructorId: c.instructor,
        courseId: c.course
      }))
    });
  } catch (err) {
    console.error('Error in debug route:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching classes',
      error: err.message 
    });
  }
});

// Debug route to test token
router.post('/debug-auth', async (req, res) => {
  console.log('=== DEBUG AUTH ROUTE HIT ===');
  console.log('Headers:', req.headers);
  console.log('Authorization header:', req.header('Authorization'));
  console.log('Body:', req.body);
  
  const token = req.header('Authorization') && req.header('Authorization').replace('Bearer ', '');
  console.log('Extracted token:', token ? 'Token present' : 'No token');
  
  res.json({ 
    success: true, 
    message: 'Debug route hit',
    hasAuth: !!req.header('Authorization'),
    tokenLength: token ? token.length : 0
  });
});

// Test route without middleware
router.post('/test-create', async (req, res) => {
  console.log('=== TEST CREATE ROUTE HIT ===');
  console.log('REQUEST BODY:', JSON.stringify(req.body, null, 2));
  
  try {
    res.status(200).json({ 
      success: true, 
      message: 'Test route working',
      receivedData: req.body
    });
  } catch (err) {
    console.error('Error in test route:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error in test route',
      error: err.message 
    });
  }
});

// Create Live Class (Instructor only) - temporarily without auth for testing
router.post('/create', async (req, res) => {
  console.log('=== CREATE LIVE CLASS ROUTE HIT ===');
  console.log('REQUEST BODY:', JSON.stringify(req.body, null, 2));
  
  try {
    // Temporary hardcoded instructor ID for testing
    const tempInstructorId = '676f4b7008db91fd4c93b3b1';
    console.log('Using temp instructor ID:', tempInstructorId);
    
    const { title, description, courseId, scheduledTime, duration, maxParticipants, isRecorded, chatEnabled, screenShareEnabled } = req.body;
    
    // Validate required fields with detailed error messages
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!courseId) missingFields.push('courseId');
    if (!scheduledTime) missingFields.push('scheduledTime');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields
      });
    }

    // Validate and parse date
    let scheduledDate;
    try {
      scheduledDate = new Date(scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (dateError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for scheduledTime. Please use ISO 8601 format (e.g., 2023-08-23T14:30:00Z)',
        error: dateError.message
      });
    }

    // Check if scheduled time is in the future
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }
    
    // Validate course exists
    const courseExists = await CourseModel.findById(courseId);
    if (!courseExists) {
      return res.status(404).json({
        success: false,
        message: 'Course not found with the provided ID'
      });
    }
    
    console.log('=== GENERATING ROOM DATA ===');
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    // Use the full URL format that matches the frontend route
    const meetingUrl = `http://localhost:3000/live-class/${roomId}`;
    console.log('Generated roomId:', roomId);
    console.log('Generated meetingUrl:', meetingUrl);
    
    const classData = {
      title: title.trim(),
      description: description.trim(),
      instructor: tempInstructorId,
      course: courseId,
      scheduledAt: scheduledDate,
      duration: parseInt(duration) || 60,
      roomId,
      meetingUrl,
      maxAttendees: parseInt(maxParticipants) || 100,
      isRecorded: Boolean(isRecorded),
      chatEnabled: chatEnabled !== false,
      screenShareEnabled: screenShareEnabled !== false,
      status: 'scheduled'
    };
    
    console.log('=== CREATING LIVE CLASS WITH DATA ===');
    console.log('Class Data:', JSON.stringify(classData, null, 2));
    
    // Create and save the new live class
    let newClass;
    try {
      // First, verify the course exists
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found with the provided ID'
        });
      }
      
      // Verify the instructor exists
      const instructor = await UserModel.findById(tempInstructorId);
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: 'Instructor not found'
        });
      }
      
      // Create and save the live class
      newClass = new LiveClassModel(classData);
      await newClass.save();
      console.log('=== LIVE CLASS SAVED SUCCESSFULLY ===');
      
      // Populate references with explicit model paths
      const populatedClass = await LiveClassModel.findById(newClass._id)
        .populate({
          path: 'instructor',
          select: 'firstName lastName email image',
          model: 'User'  // Explicitly specify the model
        })
        .populate({
          path: 'course',
          select: 'courseName courseDescription thumbnail',
          model: 'Course'  // Explicitly specify the model
        });
      
      console.log('=== REFERENCES POPULATED SUCCESSFULLY ===');
      
      return res.status(201).json({ 
        success: true, 
        message: 'Live class created successfully',
        liveClass: newClass 
      });
      
    } catch (saveError) {
      console.error('Database save error:', saveError);
      
      // Handle duplicate key errors
      if (saveError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'A live class with similar details already exists',
          error: saveError.message,
          code: 'DUPLICATE_KEY'
        });
      }
      
      // Handle validation errors
      if (saveError.name === 'ValidationError') {
        const errors = Object.values(saveError.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      
      throw saveError; // Re-throw for the outer catch
    }
    
  } catch (error) {
    console.error('Unexpected error in create live class:', error);
    
    return res.status(500).json({ 
      success: false, 
      message: 'An unexpected error occurred while creating the live class',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

// Get all upcoming live classes
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    const classes = await LiveClass.find({ 
      scheduledAt: { $gte: now },
      status: { $in: ['scheduled', 'live'] }
    })
    .populate('instructor', 'firstName lastName email')
    .populate('course', 'courseName thumbnail')
    .sort({ scheduledAt: 1 });
    
    res.json({ success: true, classes });
  } catch (err) {
    console.error('Error fetching upcoming classes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching upcoming classes' 
    });
  }
});

// Get live classes for a specific course
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const classes = await LiveClass.find({ course: courseId })
      .populate('instructor', 'firstName lastName email')
      .sort({ scheduledAt: -1 });
    
    res.json({ success: true, classes });
  } catch (err) {
    console.error('Error fetching course classes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching course classes' 
    });
  }
});

// Join a live class (Students)
router.post('/join/:classId', auth, async (req, res) => {
  console.log('=== JOIN LIVE CLASS REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request params:', req.params);
  console.log('User:', req.user);
  
  let liveClass;
  try {
    console.log('=== JOIN LIVE CLASS REQUEST ===');
    const { classId } = req.params;
    const userId = req.user?.id || req.body.userId; // Fallback for testing
    
    console.log('Class ID:', classId);
    console.log('User ID:', userId);
    
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      console.error('Invalid class ID format:', classId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid class ID format' 
      });
    }
    
    // Find the live class
    console.log('Fetching live class with ID:', classId);
    liveClass = await LiveClassModel.findById(classId)
      .populate('instructor', 'firstName lastName email')
      .lean()
      .exec();
    
    console.log('Found live class:', liveClass ? 'yes' : 'no');
    
    if (!liveClass) {
      console.error('Live class not found with ID:', classId);
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    // Check if class is live or about to start (within 10 minutes)
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    if (!liveClass.scheduledAt) {
      console.error('scheduledAt is missing for class:', liveClass._id);
      return res.status(400).json({
        success: false,
        message: 'Class schedule is not set',
        details: 'The class does not have a scheduled time.'
      });
    }
    
    const classTime = new Date(liveClass.scheduledAt);
    console.log('Class scheduled time:', classTime.toISOString());
    if (isNaN(classTime.getTime())) {
      throw new Error('Invalid scheduledAt date');
    }
    
    const timeDiff = classTime.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff > 10 && liveClass.status !== 'live') {
      return res.status(400).json({ 
        success: false, 
        message: 'Class is not yet available to join' 
      });
    }
    
    // Check if user is already in the class
    try {
      if (!liveClass.attendees) {
        liveClass.attendees = [];
      }
      
      const existingAttendee = liveClass.attendees.find(a => {
        try {
          return a.student.toString() === userId.toString() && !a.leftAt;
        } catch (e) {
          console.error('Error checking attendee:', e);
          return false;
        }
      });
      
      if (existingAttendee) {
        console.log('User already in class:', userId);
        return res.status(200).json({
          success: true,
          message: 'Already joined the class',
          data: {
            liveClass,
            isNewJoin: false
          }
        });
      }
      
      // Add user to attendees
      liveClass.attendees.push({
        student: new mongoose.Types.ObjectId(userId),
        joinedAt: new Date(),
        leftAt: null
      });
      console.log('Added user to attendees:', userId);
      
    } catch (attendeeError) {
      console.error('Error processing attendee:', {
        error: attendeeError,
        userId,
        classId: liveClass._id,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        message: 'Error processing attendee information',
        details: 'There was an issue adding you to the class.'
      });
    }
    // Check if class is full
    const activeAttendees = liveClass.attendees.filter(attendee => !attendee.leftAt);
    if (activeAttendees.length >= liveClass.maxAttendees) {
      return res.status(400).json({ 
        success: false, 
        message: 'Class is full' 
      });
    }
    
    // Update class status to live if it's the first attendee and time is right
    if (liveClass.status === 'scheduled' && minutesDiff <= 0) {
      liveClass.status = 'live';
    }
    
    try {
      // Save the updated class
      const updatedClass = await LiveClassModel.findByIdAndUpdate(
        liveClass._id,
        { 
          $set: { 
            status: liveClass.status,
            attendees: liveClass.attendees,
            updatedAt: new Date()
          } 
        },
        { new: true, runValidators: true }
      ).lean().exec();
      
      if (!updatedClass) {
        throw new Error('Failed to update live class after join');
      }
      
      console.log('Successfully updated live class:', updatedClass._id);
      liveClass = updatedClass;
      
    } catch (saveError) {
      console.error('Error saving live class:', {
        error: saveError,
        classId: liveClass._id,
        timestamp: new Date().toISOString()
      });
      
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          details: Object.values(saveError.errors).map(e => e.message).join('. ')
        });
      }
      
      throw saveError; // Let the outer catch handle it
    }
    
    console.log('Successfully joined live class:', {
      classId: liveClass._id,
      userId,
      status: liveClass.status,
      attendees: liveClass.attendees.length
    });
    
    res.json({ 
      success: true, 
      message: 'Successfully joined the live class',
      meetingUrl: liveClass.meetingUrl,
      liveClass 
    });
  } catch (err) {
    // Get classId and userId from the request for error logging
    const { classId } = req.params;
    const userId = req.user?.id;
    
    console.error('Error in join live class:', {
      error: err,
      stack: err.stack,
      classId,
      userId,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Handle specific error types
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        details: 'The provided class ID is not valid.'
      });
    }
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: Object.values(err.errors).map(e => e.message).join('. ')
      });
    }
    
    // Default error response
    res.status(500).json({ 
      success: false, 
      message: 'Server error joining live class',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Leave a live class
router.post('/leave/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user?.id;
    
    const liveClass = await LiveClassModel.findById(classId).populate('instructor', 'firstName lastName email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    // Find and update the attendee record
    const attendee = liveClass.attendees.find(
      att => att.student.toString() === userId && !att.leftAt
    );
    
    if (attendee) {
      attendee.leftAt = new Date();
      await liveClass.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Successfully left the live class' 
    });
  } catch (err) {
    console.error('Error leaving live class:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error leaving live class' 
    });
  }
});

// Get live class details by roomId
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const liveClass = await LiveClass.findOne({ roomId });
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    res.json({ success: true, liveClass });
  } catch (err) {
    console.error('Error fetching live class by roomId:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching live class' 
    });
  }
});

// Update live class status - temporarily removed isInstructor middleware for testing
router.put('/:classId/status', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.body;

    // Normalize status (accept both 'started' and 'live' for starting a class)
    const normalizedStatus = status === 'started' ? 'live' : status;
    
    // Validate status
    if (!['scheduled', 'live', 'completed', 'cancelled'].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: scheduled, live/started, completed, cancelled'
      });
    }

    // Find and update the live class with normalized status
    const updatedClass = await LiveClassModel.findByIdAndUpdate(
      classId,
      { status: normalizedStatus },
      { new: true, runValidators: true }
    )
    .populate('instructor', 'firstName lastName email image')
    .populate('course', 'courseName courseDescription thumbnail');

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: 'Live class not found'
      });
    }

    // Check if the instructor owns the class
    if (updatedClass.instructor._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this class status'
      });
    }

    // Ensure we have a meeting URL and roomId
    const meetingUrl = updatedClass.meetingUrl || `http://localhost:3000/live-class/${updatedClass.roomId}`;
    
    // Return the updated class with the meeting URL and roomId
    return res.status(200).json({
      success: true,
      message: 'Live class status updated successfully',
      liveClass: {
        ...updatedClass._doc,
        meetingUrl: meetingUrl
      },
      meetingUrl: meetingUrl,
      roomId: updatedClass.roomId
    });
  } catch (error) {
    console.error('Error updating live class status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update live class status',
      error: error.message
    });
  }
});

// Get live class details
router.get('/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const liveClass = await LiveClass.findById(classId)
      .populate('instructor', 'firstName lastName email')
      .populate('course', 'courseName thumbnail')
      .populate('attendees.student', 'firstName lastName email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    res.json({ success: true, liveClass });
  } catch (err) {
    console.error('Error fetching live class:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching live class' 
    });
  }
});

// Start live class (Instructor only)
router.post('/:classId/start', auth, isInstructor, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const liveClass = await LiveClassModel.findById(classId).populate('instructor', 'firstName lastName email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    // Check if user is the instructor
    if (liveClass.instructor.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only instructor can start this class' 
      });
    }
    
    // Check if class is scheduled
    if (liveClass.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Class is not in scheduled status' 
      });
    }
    
    // Update status to live
    liveClass.status = 'live';
    await liveClass.save();
    
    res.json({ 
      success: true, 
      message: 'Live class started successfully',
      liveClass,
      meetingUrl: liveClass.meetingUrl
    });
  } catch (err) {
    console.error('Error starting live class:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error starting live class' 
    });
  }
});

// Update live class status (Instructor only)
router.patch('/:classId/status', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { status } = req.body;
    
    const liveClass = await LiveClassModel.findById(classId).populate('instructor', 'firstName lastName email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    // Check if user is the instructor
    if (liveClass.instructor.toString() !== (req.user?.id || req.body.instructorId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only instructor can update class status' 
      });
    }
    
    liveClass.status = status;
    await liveClass.save();
    
    res.json({ 
      success: true, 
      message: 'Class status updated successfully',
      liveClass 
    });
  } catch (err) {
    console.error('Error updating class status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating class status' 
    });
  }
});

// Get my live classes (for instructors)
router.get('/instructor/my-classes', auth, async (req, res) => {
  try {
    const instructorId = req.user?.id || req.query.instructorId;
    const classes = await LiveClass.find({ instructor: instructorId })
      .populate('course', 'courseName thumbnail')
      .sort({ scheduledAt: -1 });
    
    res.json({ success: true, classes });
  } catch (err) {
    console.error('Error fetching instructor classes:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching instructor classes' 
    });
  }
});

// Delete live class (Instructor only)
router.delete('/:classId', auth, isInstructor, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const liveClass = await LiveClassModel.findById(classId).populate('instructor', 'firstName lastName email');
    
    if (!liveClass) {
      return res.status(404).json({ 
        success: false, 
        message: 'Live class not found' 
      });
    }
    
    // Check if user is the instructor
    if (liveClass.instructor.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only instructor can delete this class' 
      });
    }
    
    // Don't allow deletion of live or completed classes
    if (liveClass.status === 'live') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete a live class' 
      });
    }
    
    await LiveClass.findByIdAndDelete(classId);
    
    res.json({ 
      success: true, 
      message: 'Live class deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting live class:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting live class',
      error: err.message 
    });
  }
});

module.exports = router;
