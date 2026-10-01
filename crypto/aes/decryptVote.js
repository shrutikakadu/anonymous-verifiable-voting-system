const crypto = require('crypto');

const normalizeAESKey = (secretKey) => {
  const value = typeof secretKey === 'string' ? secretKey : String(secretKey);

  if (value.length === 32) {
    return Buffer.from(value, 'utf8');
  }

  if (value.length === 64 && /^[0-9a-fA-F]+$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  return crypto.createHash('sha256').update(value).digest();
};

const decryptVote = (cipherTextHex, secretKeyHex, ivHex) => {
  const key = normalizeAESKey(secretKeyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = { decryptVote };
