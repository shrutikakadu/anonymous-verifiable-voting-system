'use strict';

/**
 * backend/crypto/aes.js
 * ---------------------
 * Member 5 (Rutuja): AES-256-GCM vote encryption and decryption.
 *
 * Algorithm: AES-256-GCM (Authenticated Encryption with Associated Data, AEAD)
 *   - Provides both confidentiality (encryption) AND integrity (authentication tag).
 *   - Any modification to the ciphertext, IV or authentication tag is detected and
 *     rejected at decryption time.
 *
 * Key format: Exactly 64 hexadecimal characters, which decode to 32 bytes.
 *   Generate a safe key with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *   Set it in the environment as:
 *     AES_SECRET_KEY=<64 hex characters>
 *
 * This module is intentionally independent of Express, MongoDB and any framework.
 * It must not log keys, plaintext ballots or decrypted vote contents.
 *
 * Exported surface:
 *   encryptAES(plaintext, secretKey)  → { encryptedVote, iv, authTag, algorithm }
 *   decryptAES(encryptedRecord, secretKey)  → plaintext string
 */

const crypto = require('crypto');

// ─── Constants ────────────────────────────────────────────────────────────────

const ALGORITHM      = 'aes-256-gcm';
const KEY_BYTES      = 32;        // AES-256 requires a 32-byte key
const KEY_HEX_LENGTH = 64;        // 32 bytes expressed as hex = 64 characters
const IV_BYTES       = 12;        // 12-byte IV is the GCM standard recommendation
const IV_HEX_LENGTH  = 24;        // 12 bytes × 2 = 24 hex characters
const TAG_BYTES      = 16;        // GCM authentication tag length (default and maximum)
const TAG_HEX_LENGTH = 32;        // 16 bytes × 2 = 32 hex characters

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Validates a 64-character hexadecimal key string and decodes it into a 32-byte Buffer.
 *
 * Rejects:
 *  - Absent or non-string values
 *  - Strings that are not exactly 64 characters
 *  - Strings containing non-hexadecimal characters
 *  - 32-character ASCII strings (old format) — these are NOT accepted
 *
 * Does NOT silently hash arbitrary strings into keys.
 *
 * @param {*} secretKey
 * @returns {Buffer} 32-byte key buffer
 * @throws {Error}
 */
const validateAndDecodeKey = (secretKey) => {
  if (secretKey === null || secretKey === undefined) {
    throw new Error(
      'AES key is required. ' +
      'Set AES_SECRET_KEY to a 64-character hexadecimal string in your environment.'
    );
  }

  if (typeof secretKey !== 'string') {
    throw new Error(
      `AES key must be a string, received ${typeof secretKey}.`
    );
  }

  if (secretKey.length !== KEY_HEX_LENGTH) {
    throw new Error(
      `AES key must be exactly ${KEY_HEX_LENGTH} hexadecimal characters ` +
      `(${KEY_BYTES} bytes). Received ${secretKey.length} characters. ` +
      `Generate a valid key with: ` +
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  if (!/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    throw new Error(
      `AES key must contain only hexadecimal characters (0-9, a-f, A-F). ` +
      `The provided key contains invalid characters.`
    );
  }

  return Buffer.from(secretKey, 'hex');
};

/**
 * Validates that a hex string is non-empty, is a string, and has the expected length.
 *
 * @param {*}      value        - Value to check
 * @param {string} fieldName    - Human-readable field name for error messages
 * @param {number} expectedLen  - Expected number of hex characters
 * @returns {Buffer}
 * @throws {Error}
 */
const validateHexField = (value, fieldName, expectedLen) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(
      `decryptAES: '${fieldName}' must be a non-empty string.`
    );
  }

  if (value.length !== expectedLen) {
    throw new Error(
      `decryptAES: '${fieldName}' must be exactly ${expectedLen} hex characters. ` +
      `Received ${value.length} characters.`
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(value)) {
    throw new Error(
      `decryptAES: '${fieldName}' contains invalid non-hexadecimal characters.`
    );
  }

  return Buffer.from(value, 'hex');
};

/**
 * Validates that the encrypted record object has the required shape.
 *
 * @param {*} record
 * @throws {Error}
 */
const validateEncryptedRecord = (record) => {
  if (record === null || record === undefined) {
    throw new Error(
      'decryptAES: encryptedRecord is required and must be a non-null object.'
    );
  }

  if (typeof record !== 'object' || Array.isArray(record)) {
    throw new Error(
      `decryptAES: encryptedRecord must be a plain object, received ${typeof record}.`
    );
  }

  const required = ['encryptedVote', 'iv', 'authTag'];
  for (const field of required) {
    if (!(field in record)) {
      throw new Error(
        `decryptAES: encryptedRecord is missing required field '${field}'.`
      );
    }
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * A fresh cryptographically secure 12-byte IV is generated for every call.
 * The GCM authentication tag is extracted after finalisation and included
 * in the return value alongside the ciphertext and IV.
 *
 * @param {string} plaintext  - UTF-8 string to encrypt (e.g. JSON.stringify(votePayload))
 * @param {string} secretKey  - Exactly 64 hexadecimal characters (32 decoded bytes)
 *
 * @returns {{
 *   encryptedVote: string,   // hex — AES-GCM ciphertext
 *   iv:            string,   // hex — 24 characters (12 bytes)
 *   authTag:       string,   // hex — 32 characters (16 bytes)
 *   algorithm:     string    // always "aes-256-gcm"
 * }}
 *
 * @throws {Error} if secretKey is missing, non-string, wrong length or non-hex
 * @throws {Error} if plaintext is not a non-empty string
 */
const encryptAES = (plaintext, secretKey) => {
  // Validate plaintext
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error(
      'encryptAES: plaintext must be a non-empty string.'
    );
  }

  // Validate and decode key (throws on any invalid input)
  const keyBuffer = validateAndDecodeKey(secretKey);

  // Generate a fresh random 12-byte IV for this encryption — never reuse
  const ivBuffer = crypto.randomBytes(IV_BYTES);

  // Create the GCM cipher
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, ivBuffer);

  // Encrypt the plaintext
  let encryptedHex = cipher.update(plaintext, 'utf8', 'hex');
  encryptedHex    += cipher.final('hex');

  // Extract the 16-byte GCM authentication tag AFTER cipher.final()
  const authTagHex = cipher.getAuthTag().toString('hex');

  return {
    encryptedVote: encryptedHex,
    iv:            ivBuffer.toString('hex'),
    authTag:       authTagHex,
    algorithm:     ALGORITHM,
  };
};

/**
 * Decrypts an AES-256-GCM encrypted record back to its original UTF-8 plaintext.
 *
 * The GCM authentication tag is verified by Node.js's crypto implementation
 * before any plaintext is returned. If the tag does not match — because the
 * ciphertext, IV, auth tag or key has been tampered with or is incorrect —
 * an error is thrown and no plaintext is produced.
 *
 * @param {{
 *   encryptedVote: string,  // hex ciphertext
 *   iv:            string,  // hex, 24 characters (12 bytes)
 *   authTag:       string   // hex, 32 characters (16 bytes)
 * }} encryptedRecord
 *
 * @param {string} secretKey  - Exactly 64 hexadecimal characters (32 decoded bytes)
 *
 * @returns {string} Original UTF-8 plaintext
 *
 * @throws {Error} if encryptedRecord is missing, malformed or has wrong field types/lengths
 * @throws {Error} if secretKey is missing, non-string, wrong length or non-hex
 * @throws {Error} if the GCM authentication tag verification fails (tampered data or wrong key)
 */
const decryptAES = (encryptedRecord, secretKey) => {
  // Validate the record object shape first
  validateEncryptedRecord(encryptedRecord);

  const { encryptedVote, iv, authTag } = encryptedRecord;

  // Validate and decode each hex field — lengths are enforced strictly
  // Note: encryptedVote length varies with plaintext length, so only hex-validity is checked
  if (typeof encryptedVote !== 'string' || encryptedVote.length === 0) {
    throw new Error(
      "decryptAES: 'encryptedVote' must be a non-empty string."
    );
  }
  if (!/^[0-9a-fA-F]+$/.test(encryptedVote)) {
    throw new Error(
      "decryptAES: 'encryptedVote' contains invalid non-hexadecimal characters."
    );
  }

  const ivBuffer      = validateHexField(iv,      'iv',      IV_HEX_LENGTH);
  const authTagBuffer = validateHexField(authTag,  'authTag', TAG_HEX_LENGTH);

  // Validate and decode key
  const keyBuffer = validateAndDecodeKey(secretKey);

  // Create the GCM decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);

  // Set the authentication tag BEFORE calling decipher.update() or decipher.final().
  // Node.js verifies the tag during decipher.final() and throws if it does not match.
  decipher.setAuthTag(authTagBuffer);

  let decrypted  = decipher.update(encryptedVote, 'hex', 'utf8');
  // decipher.final() performs GCM tag verification — throws on mismatch
  decrypted     += decipher.final('utf8');

  return decrypted;
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { encryptAES, decryptAES };
