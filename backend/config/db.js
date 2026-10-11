const mongoose = require('mongoose');

const connectDB = async () => {
  // ── 1. Try real MongoDB (local or Atlas) ────────────────────────────
  try {
    const conn = await mongoose.connect(
      process.env.MONGO_URI || 'mongodb://localhost:27017/anonymous-voting',
      { serverSelectionTimeoutMS: 3000 }
    );
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return;
  } catch (error) {
    console.warn(`⚠️  MongoDB connection failed: ${error.message}`);
    console.log('🔄 Trying In-Memory MongoDB fallback...');
  }

  // ── 2. Fallback: in-memory MongoDB (dev / CI) ───────────────────────
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`✅ In-Memory MongoDB connected: ${mongoUri}`);
    console.log('ℹ️  Note: Data will NOT persist between server restarts.');
    return;
  } catch (memError) {
    console.warn(`⚠️  In-Memory MongoDB failed: ${memError.message}`);
  }

  // ── 3. Last resort: continue without DB (tests use their own mocks) ─
  console.warn('⚠️  No database available. API routes requiring DB will return errors.');
  console.warn('   → To fix: install MongoDB locally OR run: npm install mongodb-memory-server');
  // Do NOT call process.exit(1) — let the server start so static/health routes work.
};

module.exports = connectDB;
