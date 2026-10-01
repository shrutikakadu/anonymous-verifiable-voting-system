const crypto = require('crypto');

const verify = (message, signature, publicKey) => {
  const verifier = crypto.createVerify('sha256');
  verifier.update(message);
  verifier.end();
  return verifier.verify(publicKey, signature, 'base64');
};

module.exports = { verify };
