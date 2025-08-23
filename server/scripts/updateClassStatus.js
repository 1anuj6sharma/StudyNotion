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

// Update class status to allow deletion
const updateClassStatus = async () => {
  try {
    console.log('Updating class statuses to "scheduled" to allow deletion...');
    
    // Update all classes to scheduled status (which can be deleted)
    const result = await LiveClass.updateMany(
      { status: { $in: ['live', 'completed'] } },
      { status: 'scheduled' }
    );
    
    console.log(`Updated ${result.modifiedCount} classes to "scheduled"`);
    
    // Show updated classes
    const updatedClasses = await LiveClass.find({})
      .select('title status scheduledAt')
      .sort({ createdAt: -1 });
    
    console.log('\nCurrent class statuses:');
    updatedClasses.forEach(cls => {
      console.log(`- ${cls.title}: ${cls.status}`);
    });
    
  } catch (error) {
    console.error('Error updating class statuses:', error);
  } finally {
    mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

// Run the update
const runUpdate = async () => {
  await connectDB();
  await updateClassStatus();
};

runUpdate();
