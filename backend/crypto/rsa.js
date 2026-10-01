const crypto = require('crypto');

const generateRSAKeyPair = () => {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
};

const signWithPrivateKey = (message, privateKey) => {
  const signer = crypto.createSign('sha256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, 'base64');
};

const verifyWithPublicKey = (message, signature, publicKey) => {
  const verifier = crypto.createVerify('sha256');
  verifier.update(message);
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64');
};

module.exports = {
  generateRSAKeyPair,
  signWithPrivateKey,
  verifyWithPublicKey,
};
