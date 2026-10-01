const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const VotingToken = require('../models/VotingToken');
const { signToken, hashToken, verifyTokenSignature } = require('../services/tokenService');
const { ensureKeyFiles, getKeyPairPaths } = require('../crypto/keyManager');

const generateToken = async (req, res, next) => {
  try {
    ensureKeyFiles();
    const { privateKeyPath, publicKeyPath } = getKeyPairPaths();

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

    const token = crypto.randomBytes(32).toString('hex');
    const signature = signToken(token, privateKey);
    const tokenHash = hashToken(token);

    await VotingToken.create({ tokenHash, used: false });

    return res.json({
      message: 'Anonymous token generated',
      token,
      signature,
      publicKey,
      tokenHash,
    });
  } catch (error) {
    next(error);
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const { token, signature, publicKey } = req.body;

    if (!token || !signature || !publicKey) {
      return res.status(400).json({ message: 'Token, signature, and public key are required' });
    }

    const isValidSignature = verifyTokenSignature(token, signature, publicKey);
    if (!isValidSignature) {
      return res.status(401).json({ message: 'Fake or tampered token rejected' });
    }

    const tokenHash = hashToken(token);
    const existingToken = await VotingToken.findOne({ tokenHash });

    if (!existingToken) {
      return res.status(401).json({ message: 'Token not recognized' });
    }

    if (existingToken.used) {
      return res.status(409).json({ message: 'Token has already been used' });
    }

    return res.json({ valid: true, message: 'Token verified successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateToken, verifyToken };
