const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Vote = require('../models/Vote');
const { jwtSecret } = require('../config/keys');
const { getTallyResults } = require('../services/tallyService');

const adminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign({ sub: admin._id, role: 'admin', username: admin.username }, jwtSecret, {
      expiresIn: '3h',
    });

    return res.json({ message: 'Admin login successful', token });
  } catch (error) {
    next(error);
  }
};

const adminDashboard = async (req, res, next) => {
  try {
    const tally = await getTallyResults();
    return res.json({
      message: 'Admin dashboard data',
      totalVotes: tally.totalVotes,
      candidateResults: tally.candidateResults,
    });
  } catch (error) {
    next(error);
  }
};

const tallyVotes = async (req, res, next) => {
  try {
    const tally = await getTallyResults();
    return res.json({
      message: 'Secure tally complete',
      totalVotes: tally.totalVotes,
      candidateResults: tally.candidateResults,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { adminLogin, adminDashboard, tallyVotes };
