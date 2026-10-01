const crypto = require('crypto');

const sha256 = (input) => crypto.createHash('sha256').update(String(input)).digest('hex');

module.exports = { sha256 };
