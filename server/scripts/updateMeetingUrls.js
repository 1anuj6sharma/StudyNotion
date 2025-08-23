const mongoose = require('mongoose');
const LiveClass = require('../models/LiveClass');
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

// Update all live classes with old meeting URLs
const updateMeetingUrls = async () => {
  try {
    console.log('Starting to update meeting URLs...');
    
    // Find all live classes with the old domain
    const classesToUpdate = await LiveClass.find({
      meetingUrl: { $regex: 'meet.studynotion.com' }
    });
    
    console.log(`Found ${classesToUpdate.length} classes to update`);
    
    for (const liveClass of classesToUpdate) {
      // Extract roomId from the old URL or use the existing roomId
      const roomId = liveClass.roomId;
      const newMeetingUrl = `http://localhost:3000/live-class/${roomId}`;
      
      // Update the meeting URL
      await LiveClass.findByIdAndUpdate(liveClass._id, {
        meetingUrl: newMeetingUrl
      });
      
      console.log(`Updated class "${liveClass.title}" - New URL: ${newMeetingUrl}`);
    }
    
    console.log('All meeting URLs updated successfully!');
    
    // Verify the update
    const remainingOldUrls = await LiveClass.find({
      meetingUrl: { $regex: 'meet.studynotion.com' }
    });
    
    if (remainingOldUrls.length === 0) {
      console.log('✅ No more classes with old URLs found');
    } else {
      console.log(`⚠️  Still ${remainingOldUrls.length} classes with old URLs`);
    }
    
  } catch (error) {
    console.error('Error updating meeting URLs:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the migration
const runMigration = async () => {
  await connectDB();
  await updateMeetingUrls();
};

runMigration();
