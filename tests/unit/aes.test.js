'use strict';

/**
 * tests/unit/aes.test.js
 * ----------------------
 * Member 5 (Rutuja): Unit tests for backend/crypto/aes.js
 *
 * Covers:
 *  Suite 1 — encryptAES key validation
 *  Suite 2 — encryptAES output format
 *  Suite 3 — IV uniqueness (semantic security)
 *  Suite 4 — Round-trip decryption (basic, JSON, Unicode)
 *  Suite 5 — Tamper and wrong-key rejection
 *  Suite 6 — decryptAES record structure validation
 *
 * No external dependencies beyond the built-in crypto module and Jest.
 * Run from the project root with:
 *   npm run test:unit
 *   npx jest --runInBand tests/unit/aes.test.js
 */

const { encryptAES, decryptAES } = require('../../backend/crypto/aes');

// ─── Shared test fixtures ─────────────────────────────────────────────────────

/**
 * A valid 64-character hexadecimal key (32 decoded bytes).
 * This key is safe to use in tests because it is not a production secret.
 * Verified length: exactly 64 hex characters.
 */
const VALID_KEY =
  'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

/** A second valid key — different from VALID_KEY — used in wrong-key tests.
 * Verified length: exactly 64 hex characters. */
const DIFFERENT_KEY =
  'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

const BASIC_PLAINTEXT = 'Hello, secure ballot!';
const JSON_PLAINTEXT  = JSON.stringify({ candidateId: 'c1', timestamp: 1234567890 });
const UNICODE_PLAINTEXT = 'मतदान: उम्मीदवार १'; // Devanagari — tests multi-byte UTF-8

// ─── Suite 1: encryptAES — key validation ─────────────────────────────────────

describe('Suite 1: encryptAES — key validation', () => {
  it('1.1 throws when key is undefined', () => {
    expect(() => encryptAES(BASIC_PLAINTEXT, undefined)).toThrow(/key is required/i);
  });

  it('1.2 throws when key is null', () => {
    expect(() => encryptAES(BASIC_PLAINTEXT, null)).toThrow(/key is required/i);
  });

  it('1.3 throws when key is an empty string', () => {
    expect(() => encryptAES(BASIC_PLAINTEXT, '')).toThrow(/exactly 64/i);
  });

  it('1.4 throws when key is too short (63 hex chars)', () => {
    const shortKey = 'a'.repeat(63);
    expect(() => encryptAES(BASIC_PLAINTEXT, shortKey)).toThrow(/exactly 64/i);
  });

  it('1.5 throws when key is too long (65 hex chars)', () => {
    const longKey = 'b'.repeat(65);
    expect(() => encryptAES(BASIC_PLAINTEXT, longKey)).toThrow(/exactly 64/i);
  });

  it('1.6 throws when key is 32 ASCII characters (old CBC format — must not be hashed)', () => {
    const oldFormatKey = '12345678901234567890123456789012'; // 32 chars, not 64 hex
    expect(() => encryptAES(BASIC_PLAINTEXT, oldFormatKey)).toThrow(/exactly 64/i);
  });

  it('1.7 throws when key contains non-hex characters', () => {
    const nonHexKey = 'z'.repeat(64); // 'z' is not a hex digit
    expect(() => encryptAES(BASIC_PLAINTEXT, nonHexKey)).toThrow(/hexadecimal/i);
  });

  it('1.8 throws when key is a number instead of a string', () => {
    expect(() => encryptAES(BASIC_PLAINTEXT, 12345)).toThrow(/must be a string/i);
  });

  it('1.9 accepts a valid 64-character lowercase hex key', () => {
    expect(() => encryptAES(BASIC_PLAINTEXT, VALID_KEY)).not.toThrow();
  });

  it('1.10 accepts a valid 64-character uppercase hex key', () => {
    const upperKey = VALID_KEY.toUpperCase();
    expect(() => encryptAES(BASIC_PLAINTEXT, upperKey)).not.toThrow();
  });
});

// ─── Suite 2: encryptAES — plaintext validation ───────────────────────────────

describe('Suite 2: encryptAES — plaintext validation', () => {
  it('2.1 throws when plaintext is undefined', () => {
    expect(() => encryptAES(undefined, VALID_KEY)).toThrow(/non-empty string/i);
  });

  it('2.2 throws when plaintext is an empty string', () => {
    expect(() => encryptAES('', VALID_KEY)).toThrow(/non-empty string/i);
  });

  it('2.3 throws when plaintext is a number', () => {
    expect(() => encryptAES(42, VALID_KEY)).toThrow(/non-empty string/i);
  });
});

// ─── Suite 3: encryptAES — output format ──────────────────────────────────────

describe('Suite 3: encryptAES — output format', () => {
  let result;

  beforeAll(() => {
    result = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
  });

  it('3.1 returns an object with exactly the four expected fields', () => {
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(['algorithm', 'authTag', 'encryptedVote', 'iv'].sort());
  });

  it('3.2 algorithm field is exactly "aes-256-gcm"', () => {
    expect(result.algorithm).toBe('aes-256-gcm');
  });

  it('3.3 iv is a string of exactly 24 hex characters (12 bytes)', () => {
    expect(typeof result.iv).toBe('string');
    expect(result.iv).toHaveLength(24);
    expect(result.iv).toMatch(/^[0-9a-f]{24}$/i);
  });

  it('3.4 authTag is a string of exactly 32 hex characters (16 bytes)', () => {
    expect(typeof result.authTag).toBe('string');
    expect(result.authTag).toHaveLength(32);
    expect(result.authTag).toMatch(/^[0-9a-f]{32}$/i);
  });

  it('3.5 encryptedVote is a non-empty hex string', () => {
    expect(typeof result.encryptedVote).toBe('string');
    expect(result.encryptedVote.length).toBeGreaterThan(0);
    expect(result.encryptedVote).toMatch(/^[0-9a-f]+$/i);
  });

  it('3.6 encryptedVote does not equal the plaintext', () => {
    expect(result.encryptedVote).not.toBe(BASIC_PLAINTEXT);
  });
});

// ─── Suite 4: IV uniqueness (semantic security) ───────────────────────────────

describe('Suite 4: IV uniqueness (semantic security)', () => {
  it('4.1 generates a different IV on every call with the same inputs', () => {
    const r1 = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    const r2 = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    expect(r1.iv).not.toBe(r2.iv);
  });

  it('4.2 produces a different ciphertext on every call (because IV differs)', () => {
    const r1 = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    const r2 = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    expect(r1.encryptedVote).not.toBe(r2.encryptedVote);
  });

  it('4.3 generates unique IVs across 100 consecutive encryptions', () => {
    const ivSet = new Set();
    for (let i = 0; i < 100; i++) {
      const { iv } = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
      ivSet.add(iv);
    }
    expect(ivSet.size).toBe(100);
  });
});

// ─── Suite 5: Round-trip decryption ───────────────────────────────────────────

describe('Suite 5: Round-trip decryption', () => {
  it('5.1 decrypts a basic ASCII plaintext back to the original', () => {
    const record = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    expect(decryptAES(record, VALID_KEY)).toBe(BASIC_PLAINTEXT);
  });

  it('5.2 decrypts a JSON-stringified vote payload back to the original', () => {
    const record = encryptAES(JSON_PLAINTEXT, VALID_KEY);
    const decrypted = decryptAES(record, VALID_KEY);
    expect(decrypted).toBe(JSON_PLAINTEXT);
    // Also confirm it round-trips through JSON.parse
    const parsed = JSON.parse(decrypted);
    expect(parsed.candidateId).toBe('c1');
  });

  it('5.3 decrypts a multi-byte Unicode payload correctly', () => {
    const record = encryptAES(UNICODE_PLAINTEXT, VALID_KEY);
    expect(decryptAES(record, VALID_KEY)).toBe(UNICODE_PLAINTEXT);
  });

  it('5.4 decrypts when IV is uppercase hex', () => {
    const record = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    const upperRecord = { ...record, iv: record.iv.toUpperCase() };
    expect(decryptAES(upperRecord, VALID_KEY)).toBe(BASIC_PLAINTEXT);
  });

  it('5.5 decrypts when authTag is uppercase hex', () => {
    const record = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
    const upperRecord = { ...record, authTag: record.authTag.toUpperCase() };
    expect(decryptAES(upperRecord, VALID_KEY)).toBe(BASIC_PLAINTEXT);
  });

  it('5.6 decrypts correctly for a very long plaintext', () => {
    const longText = 'x'.repeat(10000);
    const record = encryptAES(longText, VALID_KEY);
    expect(decryptAES(record, VALID_KEY)).toBe(longText);
  });
});

// ─── Suite 6: Tamper and wrong-key rejection ──────────────────────────────────

describe('Suite 6: Tamper and wrong-key rejection', () => {
  /**
   * Flip the character at position `index` in the hex string.
   * '0' → '1', any other char → '0'. Ensures the byte value changes.
   */
  const flipHexChar = (hexStr, index = 0) => {
    const chars = hexStr.split('');
    chars[index] = chars[index] === '0' ? '1' : '0';
    return chars.join('');
  };

  let record;
  beforeAll(() => {
    record = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
  });

  it('6.1 throws when a different (valid) key is used for decryption', () => {
    expect(() => decryptAES(record, DIFFERENT_KEY)).toThrow();
  });

  it('6.2 throws when the ciphertext is modified (one hex char flipped)', () => {
    const tampered = { ...record, encryptedVote: flipHexChar(record.encryptedVote, 2) };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow();
  });

  it('6.3 throws when the authentication tag is modified', () => {
    const tampered = { ...record, authTag: flipHexChar(record.authTag, 4) };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow();
  });

  it('6.4 throws when the IV is modified', () => {
    const tampered = { ...record, iv: flipHexChar(record.iv, 6) };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow();
  });

  it('6.5 throws when authTag is replaced with a zeroed-out tag', () => {
    const tampered = { ...record, authTag: '0'.repeat(32) };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow();
  });

  it('6.6 throws when encryptedVote is replaced with an empty-like hex string', () => {
    // A ciphertext of all zeroes of the same length should fail tag verification
    const zerodCiphertext = '00'.repeat(record.encryptedVote.length / 2);
    const tampered = { ...record, encryptedVote: zerodCiphertext };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow();
  });
});

// ─── Suite 7: decryptAES — record structure validation ────────────────────────

describe('Suite 7: decryptAES — record structure validation', () => {
  let validRecord;
  beforeAll(() => {
    validRecord = encryptAES(BASIC_PLAINTEXT, VALID_KEY);
  });

  it('7.1 throws when encryptedRecord is null', () => {
    expect(() => decryptAES(null, VALID_KEY)).toThrow(/required.*non-null/i);
  });

  it('7.2 throws when encryptedRecord is undefined', () => {
    expect(() => decryptAES(undefined, VALID_KEY)).toThrow(/required.*non-null/i);
  });

  it('7.3 throws when encryptedRecord is a plain string', () => {
    expect(() => decryptAES('some-cipher', VALID_KEY)).toThrow(/plain object/i);
  });

  it('7.4 throws when encryptedRecord is an array', () => {
    expect(() => decryptAES([], VALID_KEY)).toThrow(/plain object/i);
  });

  it('7.5 throws when encryptedVote field is missing', () => {
    const { encryptedVote: _omit, ...rest } = validRecord;
    expect(() => decryptAES(rest, VALID_KEY)).toThrow(/missing.*encryptedVote/i);
  });

  it('7.6 throws when iv field is missing', () => {
    const { iv: _omit, ...rest } = validRecord;
    expect(() => decryptAES(rest, VALID_KEY)).toThrow(/missing.*iv/i);
  });

  it('7.7 throws when authTag field is missing', () => {
    const { authTag: _omit, ...rest } = validRecord;
    expect(() => decryptAES(rest, VALID_KEY)).toThrow(/missing.*authTag/i);
  });

  it('7.8 throws when iv has wrong length (too short)', () => {
    const tampered = { ...validRecord, iv: validRecord.iv.slice(0, 20) };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow(/exactly 24/i);
  });

  it('7.9 throws when authTag has wrong length (too short)', () => {
    const tampered = { ...validRecord, authTag: validRecord.authTag.slice(0, 28) };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow(/exactly 32/i);
  });

  it('7.10 throws when iv contains non-hex characters', () => {
    const badIv = 'z'.repeat(24);
    const tampered = { ...validRecord, iv: badIv };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow(/hexadecimal/i);
  });

  it('7.11 throws when encryptedVote is an empty string', () => {
    const tampered = { ...validRecord, encryptedVote: '' };
    expect(() => decryptAES(tampered, VALID_KEY)).toThrow(/non-empty string/i);
  });

  it('7.12 throws when decryptAES key is missing', () => {
    expect(() => decryptAES(validRecord, undefined)).toThrow(/key is required/i);
  });
});
