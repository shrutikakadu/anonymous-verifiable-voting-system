const crypto = require('crypto');
const { generateKeyPairSync, createSign, verify } = require('crypto');
const { createHash } = require('crypto');

const generateKeyPair = () => {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
};

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
  signToken,
  verifyTokenSignature,
  hashToken,
};
