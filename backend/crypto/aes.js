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

const normalizeIV = (ivValue) => {
  const value = typeof ivValue === 'string' ? ivValue : String(ivValue);

  if (value.length === 16) {
    return Buffer.from(value, 'utf8');
  }

  if (value.length === 32 && /^[0-9a-fA-F]+$/.test(value)) {
    return Buffer.from(value, 'hex');
  }

  return Buffer.from(value, 'hex');
};

const encryptAES = (plainText, secretKeyHex, ivHex) => {
  const iv = normalizeIV(ivHex);
  const key = normalizeAESKey(secretKeyHex);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return encrypted;
};

const decryptAES = (cipherTextHex, secretKeyHex, ivHex) => {
  const iv = normalizeIV(ivHex);
  const key = normalizeAESKey(secretKeyHex);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(cipherTextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

module.exports = { encryptAES, decryptAES };
