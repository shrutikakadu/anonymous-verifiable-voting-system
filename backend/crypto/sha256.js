const crypto = require('crypto');

const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

module.exports = { hashValue };
