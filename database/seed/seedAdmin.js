require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../../backend/models/Admin');

const seedAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/anonymous-voting');

  const existing = await Admin.findOne({ username: 'admin' });
  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await Admin.create({ username: 'admin', passwordHash, role: 'admin' });
    console.log('Admin seeded successfully');
  } else {
    console.log('Admin already exists');
  }

  await mongoose.disconnect();
};

seedAdmin().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
