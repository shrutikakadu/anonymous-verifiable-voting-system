const crypto = require('crypto');
const { generateKeyPairSync, createSign } = require('crypto');
const { createHash } = require('crypto');

/**
 * generateKeyPair
 * ---------------
 * Generates a 2048-bit RSA key pair in SPKI/PKCS#8 PEM format.
 * Must stay in sync with backend/crypto/rsa.js and the on-disk key files
 * created by keyManager.js (both use spki/pkcs8).
 */
const generateKeyPair = () => {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
};

/**
 * generateSecureToken
 * -------------------
 * Produces a cryptographically secure 32-byte random token as a 64-char hex string.
 * This is the raw token handed to the voter; it must NEVER be stored in the database.
 */
const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

const signToken = (token, privateKey) => {
  const signer = createSign('sha256');
  signer.update(token);
  signer.end();
  return signer.sign(privateKey, 'base64');
};

const verifyTokenSignature = (token, signature, publicKey) => {
  const verifier = crypto.createVerify('sha256');
  verifier.update(token);
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64');
};

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

module.exports = {
  generateKeyPair,
  generateSecureToken,
  signToken,
  verifyTokenSignature,
  hashToken,
};
