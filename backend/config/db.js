const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Try connecting to the local/provided MongoDB first
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/anonymous-voting');
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.log('Starting In-Memory Database instead...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      await mongoose.connect(mongoUri);
      console.log(`In-Memory MongoDB connected: ${mongoUri}`);
    } catch (memError) {
      console.error('Failed to start In-Memory MongoDB:', memError.message);
      console.error('Please run: npm install mongodb-memory-server in the backend folder.');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
