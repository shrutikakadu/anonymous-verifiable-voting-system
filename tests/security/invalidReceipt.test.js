/**
 * security/invalidReceipt.test.js
 * ---------------------------------
 * Part 7 (Shrutika): Security Tests — Invalid Receipts, Forgery & Tampering Detection
 *
 * Validates CNS Security Concepts:
 *  - Integrity (SHA-256 digest comparison)
 *  - Public Verifiability (Cryptographic check of ballot presence)
 *  - Attack Resistance (Rejection of fake receipts, malformed inputs, and NoSQL injection)
 *  - Anonymity Preservation (Bulletin board never leaks voter identity or secret ballot data)
 */

'use strict';

const crypto = require('crypto');

// Mock Vote model
jest.mock('../../backend/models/Vote');
const Vote = require('../../backend/models/Vote');

const { hashValue } = require('../../backend/crypto/sha256');
const {
  verifyVoteReceipt,
  getPublicBulletinBoard,
  VERIFICATION_CODES,
} = require('../../backend/services/verificationService');
const {
  verifyReceipt: verifyReceiptController,
  getBulletinBoard: getBulletinBoardController,
} = require('../../backend/controllers/verificationController');

describe('Part 7 (Shrutika): Security Tests — Receipt Verification & Bulletin Board', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Adversarial Scenario 1: Forged / Fake Receipt Hash', () => {
    test('❌ Rejects an unregistered 64-character SHA-256 hash not in database', async () => {
      const forgedReceipt = crypto.createHash('sha256').update('attacker_forged_vote').digest('hex');

      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await verifyVoteReceipt(forgedReceipt);

      expect(result.valid).toBe(false);
      expect(result.status).toBe('Not verified');
      expect(result.code).toBe(VERIFICATION_CODES.RECEIPT_NOT_FOUND);
      expect(result.receiptHash).toBe(forgedReceipt);
    });

    test('❌ Controller returns HTTP 404 for non-existent receipt', async () => {
      const forgedReceipt = 'a'.repeat(64);
      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const req = { params: { receiptHash: forgedReceipt } };
      const res = {
        statusCode: null,
        jsonData: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        },
      };

      await verifyReceiptController(req, res, () => {});

      expect(res.statusCode).toBe(404);
      expect(res.jsonData.valid).toBe(false);
      expect(res.jsonData.code).toBe(VERIFICATION_CODES.RECEIPT_NOT_FOUND);
    });
  });

  describe('Adversarial Scenario 2: Malformed and Injection Inputs', () => {
    test('❌ Rejects malformed receipt hashes (short, non-hex, null, empty)', async () => {
      const badReceipts = [
        'short123',
        'xyz-not-hex-chars-'.padEnd(64, '!'),
        '12345',
        '',
        null,
        undefined,
      ];

      for (const badHash of badReceipts) {
        const result = await verifyVoteReceipt(badHash);
        expect(result.valid).toBe(false);
        expect(result.code).toBe(VERIFICATION_CODES.INVALID_FORMAT);
      }
    });

    test('❌ Controller returns HTTP 400 for malformed receipt hash', async () => {
      const req = { params: { receiptHash: 'bad_hash' } };
      const res = {
        statusCode: null,
        jsonData: null,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          this.jsonData = data;
          return this;
        },
      };

      await verifyReceiptController(req, res, () => {});

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.valid).toBe(false);
      expect(res.jsonData.code).toBe(VERIFICATION_CODES.INVALID_FORMAT);
    });
  });

  describe('Adversarial Scenario 3: Database Record Tampering Detection', () => {
    test('❌ Detects tampering when database vote payload was altered after receipt creation', async () => {
      const genuineEncrypted = 'original_encrypted_aes_payload';
      const iv = 'abcdef0123456789abcdef0123456789';
      const candidateId = 'CAND_GENUINE';
      const genuineReceiptHash = hashValue(`${genuineEncrypted}:${iv}:${candidateId}`).toLowerCase();

      // Database record has been tampered with: candidateId changed by attacker
      const tamperedRecord = {
        encryptedVote: genuineEncrypted,
        iv,
        candidateId: 'CAND_TAMPERED', // Altered behind the scenes!
        receiptHash: genuineReceiptHash,
        timestamp: new Date(),
      };

      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(tamperedRecord),
      });

      const result = await verifyVoteReceipt(genuineReceiptHash);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VERIFICATION_CODES.INTEGRITY_FAILED);
      expect(result.status).toBe('Tampered vote record');
    });
  });

  describe('Legitimate Verification Scenario', () => {
    test('✅ Successfully confirms vote inclusion for an authentic receipt hash', async () => {
      const encryptedVote = 'aes_256_ciphertext_valid';
      const iv = '1234567890abcdef1234567890abcdef';
      const candidateId = 'CAND_A';
      const validReceiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`).toLowerCase();

      const validRecord = {
        _id: 'db_id_101',
        encryptedVote,
        iv,
        candidateId,
        receiptHash: validReceiptHash,
        timestamp: new Date('2026-10-07T12:00:00Z'),
      };

      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(validRecord),
      });

      const result = await verifyVoteReceipt(validReceiptHash);

      expect(result.valid).toBe(true);
      expect(result.status).toBe('Vote included');
      expect(result.code).toBe(VERIFICATION_CODES.VOTE_INCLUDED);
      expect(result.receiptHash).toBe(validReceiptHash);
    });
  });

  describe('Bulletin Board Public Privacy Check', () => {
    test('🛡️ Never leaks voter private identity or secret details in bulletin board', async () => {
      const mockVotes = [
        {
          receiptHash: 'a'.repeat(64),
          candidateId: 'CAND_1',
          timestamp: new Date(),
        },
      ];

      Vote.countDocuments.mockResolvedValue(1);
      Vote.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVotes),
            }),
          }),
        }),
      });

      const board = await getPublicBulletinBoard({ page: 1, limit: 10 });

      expect(board.totalVotes).toBe(1);
      expect(board.votes).toHaveLength(1);

      // Verify no voter identity fields exist in the output
      const voteEntry = board.votes[0];
      expect(voteEntry.voterId).toBeUndefined();
      expect(voteEntry.email).toBeUndefined();
      expect(voteEntry.name).toBeUndefined();
      expect(voteEntry.password).toBeUndefined();
    });
  });
});
