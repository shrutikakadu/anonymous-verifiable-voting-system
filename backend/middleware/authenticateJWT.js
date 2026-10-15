const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { jwtSecret } = require('../config/keys');
const RevokedToken = require('../models/RevokedToken');

const authenticateJWT = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !/^Bearer \S+$/.test(header)) {
    return res.status(401).json({ message: 'Missing or invalid JWT' });
  }
  const token = header.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
    if (decoded.role === 'voter' && decoded.otp !== true) {
      return res.status(401).json({ message: 'OTP verification required' });
    }
  } catch {
    return res.status(401).json({ message: 'Invalid or expired JWT' });
  }
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (await RevokedToken.exists({ tokenHash })) {
      return res.status(401).json({ message: 'JWT has been revoked' });
    }
    req.user = decoded;
    req.tokenHash = tokenHash;
    next();
  } catch (error) {
    next(error); // Fail closed if the database cannot check revocation.
  }
};

module.exports = { authenticateJWT };
