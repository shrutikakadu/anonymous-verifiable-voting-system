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

const encryptVote = (plainText, secretKeyHex, ivHex) => {
  const key = normalizeAESKey(secretKeyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

module.exports = { encryptVote };
