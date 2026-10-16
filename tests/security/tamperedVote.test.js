/**
 * tests/security/tamperedVote.test.js
 * ------------------------------------
 * Part 10: Security Tests — Tampered Vote Data Detection & Rejection
 *
 * Validates Cryptography & Network Security (CNS) Concepts:
 *  - Authenticated Encryption with Associated Data (AEAD) via AES-256-GCM
 *  - Cryptographic Authentication Tag Verification (Ciphertext, IV, Tag integrity)
 *  - Tamper Evidence in Database Records (Receipt hash integrity check)
 *  - Election Tally Integrity (Tampered ballots rejected during admin tally)
 *  - Non-repudiation and Zero-Knowledge Ballot Audit
 */

'use strict';

const crypto = require('crypto');
const request = require('supertest');

// ── Mock Mongoose models ─────────────────────────────────────────────────────
jest.mock('../../backend/models/Vote');
const Vote = require('../../backend/models/Vote');

const { encryptAES, decryptAES } = require('../../backend/crypto/aes');
const { hashValue } = require('../../backend/crypto/sha256');
const { getTallyResults } = require('../../backend/services/tallyService');
const { verifyVoteReceipt, VERIFICATION_CODES } = require('../../backend/services/verificationService');
const app = require('../../backend/app');

describe('Security Tests: Tampered Vote Detection & Rejection', () => {
  const secretKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const candidateId = 'candidate_SEC_01';
  const originalPayload = JSON.stringify({ candidateId, voteTime: '2026-10-11T12:00:00Z' });

  beforeAll(() => {
    process.env.AES_SECRET_KEY = secretKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. AES-256-GCM Cryptographic Tampering Detection
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. AES-256-GCM Authenticated Encryption Integrity', () => {
    it('❌ Throws error when ciphertext is tampered with by an attacker', () => {
      const encryptedRecord = encryptAES(originalPayload, secretKey);

      // Tamper with the ciphertext: flip the first character
      const firstChar = encryptedRecord.encryptedVote[0];
      const tamperedFirstChar = firstChar === 'a' ? 'b' : 'a';
      const tamperedRecord = {
        ...encryptedRecord,
        encryptedVote: tamperedFirstChar + encryptedRecord.encryptedVote.slice(1),
      };

      // Node crypto decipher.final() must fail GCM auth tag check
      expect(() => {
        decryptAES(tamperedRecord, secretKey);
      }).toThrow(/Unsupported state or unable to authenticate data/i);
    });

    it('❌ Throws error when authentication tag is modified', () => {
      const encryptedRecord = encryptAES(originalPayload, secretKey);

      // Tamper with the authTag
      const firstChar = encryptedRecord.authTag[0];
      const tamperedTagChar = firstChar === '1' ? '2' : '1';
      const tamperedRecord = {
        ...encryptedRecord,
        authTag: tamperedTagChar + encryptedRecord.authTag.slice(1),
      };

      expect(() => {
        decryptAES(tamperedRecord, secretKey);
      }).toThrow(/Unsupported state or unable to authenticate data/i);
    });

    it('❌ Throws error when Initialization Vector (IV) is modified', () => {
      const encryptedRecord = encryptAES(originalPayload, secretKey);

      // Tamper with the IV
      const firstChar = encryptedRecord.iv[0];
      const tamperedIvChar = firstChar === '0' ? '1' : '0';
      const tamperedRecord = {
        ...encryptedRecord,
        iv: tamperedIvChar + encryptedRecord.iv.slice(1),
      };

      expect(() => {
        decryptAES(tamperedRecord, secretKey);
      }).toThrow(/Unsupported state or unable to authenticate data/i);
    });

    it('❌ Throws error when decrypting with an incorrect or attacker-substituted AES key', () => {
      const encryptedRecord = encryptAES(originalPayload, secretKey);
      const wrongKey = crypto.randomBytes(32).toString('hex');

      expect(() => {
        decryptAES(encryptedRecord, wrongKey);
      }).toThrow(/Unsupported state or unable to authenticate data/i);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Database Record Tampering Detection via Receipt Hash Formula
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Receipt Integrity Check against Tampered Database Records', () => {
    it('❌ Flags ballot as INTEGRITY_FAILED when candidateId is altered in database', async () => {
      const { encryptedVote, iv } = encryptAES(originalPayload, secretKey);
      const originalReceiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`).toLowerCase();

      // Attacker altered candidateId in DB behind the scenes
      const tamperedDbRecord = {
        encryptedVote,
        iv,
        candidateId: 'attacker_candidate_99',
        receiptHash: originalReceiptHash,
        timestamp: new Date(),
      };

      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(tamperedDbRecord),
      });

      const result = await verifyVoteReceipt(originalReceiptHash);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VERIFICATION_CODES.INTEGRITY_FAILED);
      expect(result.status).toBe('Tampered vote record');
      expect(result.message).toContain('Integrity check failed');
    });

    it('❌ Flags ballot as INTEGRITY_FAILED when ciphertext was swapped in database', async () => {
      const { encryptedVote, iv } = encryptAES(originalPayload, secretKey);
      const originalReceiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`).toLowerCase();

      // Attacker swapped encryptedVote in DB
      const tamperedDbRecord = {
        encryptedVote: 'abcdef0123456789abcdef0123456789',
        iv,
        candidateId,
        receiptHash: originalReceiptHash,
        timestamp: new Date(),
      };

      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(tamperedDbRecord),
      });

      const result = await verifyVoteReceipt(originalReceiptHash);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VERIFICATION_CODES.INTEGRITY_FAILED);
      expect(result.status).toBe('Tampered vote record');
    });

    it('❌ API returns HTTP 404 with status "Tampered vote record" on verification endpoint', async () => {
      const { encryptedVote, iv } = encryptAES(originalPayload, secretKey);
      const originalReceiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`).toLowerCase();

      const tamperedDbRecord = {
        encryptedVote,
        iv,
        candidateId: 'manipulated_candidate',
        receiptHash: originalReceiptHash,
        timestamp: new Date(),
      };

      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(tamperedDbRecord),
      });

      const res = await request(app).get(`/api/verification/${originalReceiptHash}`);

      expect(res.status).toBe(404);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe(VERIFICATION_CODES.INTEGRITY_FAILED);
      expect(res.body.status).toBe('Tampered vote record');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Admin Tally Integrity with Tampered Ballots
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Admin Tally Isolation of Tampered Ballots', () => {
    it('❌ Accurately identifies tampered ballots under rejectedVotes and excludes them from candidate tally', async () => {
      // 1 valid ballot for Candidate A (c1)
      const validPayloadA = JSON.stringify({ candidateId: 'c1' });
      const recordA = encryptAES(validPayloadA, secretKey);

      // 1 valid ballot for Candidate B (c2)
      const validPayloadB = JSON.stringify({ candidateId: 'c2' });
      const recordB = encryptAES(validPayloadB, secretKey);

      // 1 tampered ballot: ciphertext modified, will fail GCM authentication
      const tamperedPayload = JSON.stringify({ candidateId: 'c1' });
      const recordC = encryptAES(tamperedPayload, secretKey);
      const tamperedCiphertext = (recordC.encryptedVote[0] === 'a' ? 'b' : 'a') + recordC.encryptedVote.slice(1);

      const mockVotes = [
        {
          _id: 'vote_1',
          encryptedVote: recordA.encryptedVote,
          iv: recordA.iv,
          authTag: recordA.authTag,
          candidateId: 'c1',
          receiptHash: 'receipt_1',
        },
        {
          _id: 'vote_2',
          encryptedVote: recordB.encryptedVote,
          iv: recordB.iv,
          authTag: recordB.authTag,
          candidateId: 'c2',
          receiptHash: 'receipt_2',
        },
        {
          _id: 'vote_3',
          encryptedVote: tamperedCiphertext, // TAMPERED!
          iv: recordC.iv,
          authTag: recordC.authTag,
          candidateId: 'c1',
          receiptHash: 'receipt_3',
        },
      ];

      Vote.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockVotes),
      });

      // Suppress expected console warning during test
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const tally = await getTallyResults();

      consoleSpy.mockRestore();

      expect(tally.totalVotes).toBe(3);
      expect(tally.talliedVotes).toBe(2);
      expect(tally.rejectedVotes).toBe(1); // 1 tampered ballot quarantined!
      expect(tally.candidateResults['c1']).toBe(1);
      expect(tally.candidateResults['c2']).toBe(1);
    });
  });
});
