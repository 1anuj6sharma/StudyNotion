const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Testing MongoDB connection...');
console.log('MongoDB URL:', process.env.MONGODB_URL ? 
  process.env.MONGODB_URL.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@') : 
  'MONGODB_URL not found in environment variables');

mongoose.set('debug', true);

mongoose.connection.on('connecting', () => {
  console.log('🔄 Connecting to MongoDB...');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected successfully');
  console.log('   - Host:', mongoose.connection.host);
  console.log('   - Port:', mongoose.connection.port);
  console.log('   - Database:', mongoose.connection.name);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

async function testConnection() {
  try {
    if (!process.env.MONGODB_URL) {
      throw new Error('MONGODB_URL is not defined in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    // Test the connection by listing collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📂 Collections in database:');
    collections.forEach(coll => console.log(`   - ${coll.name}`));

    // Check if ratingandreviews collection exists
    const ratingReviewsExists = collections.some(c => c.name === 'ratingandreviews');
    console.log('\n🔍 RatingAndReviews collection exists:', ratingReviewsExists);

    if (ratingReviewsExists) {
      const reviewCount = await mongoose.connection.db.collection('ratingandreviews').countDocuments();
      console.log(`📊 Found ${reviewCount} reviews in the database`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      name: error.name,
      code: error.code,
      codeName: error.codeName,
      stack: error.stack
    });
    process.exit(1);
  }
}

testConnection();
