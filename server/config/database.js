const mongoose = require("mongoose");
require("dotenv").config();

const { MONGODB_URL } = process.env;

// Enable debug mode for Mongoose
mongoose.set('debug', true);

// Connection events
mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
  console.log('   - Host:', mongoose.connection.host);
  console.log('   - Port:', mongoose.connection.port);
  console.log('   - Database:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  if (err.reason) {
    console.error('   - Reason:', err.reason);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('ℹ️ MongoDB disconnected');});

exports.connect = async () => {
  try {
    if (!MONGODB_URL) {
      throw new Error('MONGODB_URL is not defined in environment variables');
    }

    console.log('🔗 MongoDB URL:', MONGODB_URL.replace(/mongodb:\/\/[^:]+:[^@]+@/, 'mongodb://***:***@'));
    
    await mongoose.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Verify the connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB connection verified');
    
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', {
      message: err.message,
      name: err.name,
      code: err.code,
      codeName: err.codeName,
      stack: err.stack
    });
    process.exit(1);
  }
};

// Export the connection for direct access if needed
exports.connection = mongoose.connection;
