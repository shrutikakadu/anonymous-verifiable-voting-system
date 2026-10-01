const fs = require('fs');
const path = require('path');

const getKeyPairPaths = () => ({
  publicKeyPath: process.env.RSA_PUBLIC_KEY_PATH || path.join(__dirname, '../keys/public.pem'),
  privateKeyPath: process.env.RSA_PRIVATE_KEY_PATH || path.join(__dirname, '../keys/private.pem'),
});

const ensureKeyFiles = () => {
  const { publicKeyPath, privateKeyPath } = getKeyPairPaths();

  const keyDir = path.dirname(privateKeyPath);
  if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir, { recursive: true });
  }

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    const { generateRSAKeyPair } = require('./rsa');
    const { privateKey, publicKey } = generateRSAKeyPair();
    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
  }
};

module.exports = { getKeyPairPaths, ensureKeyFiles };
