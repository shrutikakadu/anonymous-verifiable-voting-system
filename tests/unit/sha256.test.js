const { hashValue } = require('../../backend/crypto/sha256');

describe('SHA-256 utility', () => {
  it('creates deterministic hashes', () => {
    expect(hashValue('hello')).toBe(hashValue('hello'));
    expect(hashValue('hello')).not.toBe(hashValue('world'));
  });
});
