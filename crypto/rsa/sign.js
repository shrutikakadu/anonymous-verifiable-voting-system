const crypto = require('crypto');

const sign = (message, privateKey) => {
  const signer = crypto.createSign('sha256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, 'base64');
};

module.exports = { sign };
