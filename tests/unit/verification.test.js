/**
 * unit/verification.test.js
 * --------------------------
 * Part 7 (Shrutika): Unit tests for Bulletin Board + Vote Verification
 *
 * Tests the verificationService in isolation using mocked Mongoose Vote model.
 *
 * Scenarios tested:
 *   ✅ Bulletin board retrieves list and totalVotes
 *   ✅ Bulletin board search filters by receipt hash
 *   ✅ Bulletin board pagination works (page, limit, totalPages)
 *   ✅ Valid receipt hash is verified -> returns status 'Vote included' and valid: true
 *   ❌ Non-existent receipt hash -> returns code RECEIPT_NOT_FOUND and valid: false
 *   ❌ Malformed receipt hash (too short, non-hex) -> returns code INVALID_FORMAT
 *   ❌ Tampered vote record in DB -> detected via SHA-256 recomputation and returns INTEGRITY_FAILED
 *   ✅ Aggregate bulletin board stats returned correctly
 */

'use strict';

const crypto = require('crypto');

// ── Mock Vote model ─────────────────────────────────────────────────────────
jest.mock('../../backend/models/Vote');
const Vote = require('../../backend/models/Vote');

const {
  getPublicBulletinBoard,
  verifyVoteReceipt,
  getBulletinBoardStats,
  isValidSha256Hash,
  VERIFICATION_CODES,
} = require('../../backend/services/verificationService');

const { hashValue } = require('../../backend/crypto/sha256');

describe('Part 7 (Shrutika): Verification Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidSha256Hash', () => {
    it('returns true for a valid 64-character hex string', () => {
      const validHash = crypto.createHash('sha256').update('test-payload').digest('hex');
      expect(isValidSha256Hash(validHash)).toBe(true);
    });

    it('returns false for non-hex, short, or invalid strings', () => {
      expect(isValidSha256Hash('')).toBe(false);
      expect(isValidSha256Hash(null)).toBe(false);
      expect(isValidSha256Hash(undefined)).toBe(false);
      expect(isValidSha256Hash('12345')).toBe(false); // too short
      expect(isValidSha256Hash('z'.repeat(64))).toBe(false); // non-hex
      expect(isValidSha256Hash('a'.repeat(65))).toBe(false); // too long
    });
  });

  describe('getPublicBulletinBoard', () => {
    it('returns list of votes and totalVotes count', async () => {
      const mockVotes = [
        {
          receiptHash: 'a'.repeat(64),
          candidateId: 'CAND_1',
          timestamp: new Date('2026-10-01T10:00:00Z'),
        },
        {
          receiptHash: 'b'.repeat(64),
          candidateId: 'CAND_2',
          timestamp: new Date('2026-10-01T11:00:00Z'),
        },
      ];

      Vote.countDocuments = jest.fn().mockResolvedValue(2);
      Vote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockVotes),
            }),
          }),
        }),
      });

      const result = await getPublicBulletinBoard({ page: 1, limit: 10 });

      expect(Vote.countDocuments).toHaveBeenCalled();
      expect(result.totalVotes).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.votes).toHaveLength(2);
      expect(result.votes[0].receiptHash).toBe('a'.repeat(64));
    });

    it('applies search filter when query is provided', async () => {
      Vote.countDocuments = jest.fn().mockResolvedValue(1);
      Vote.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([{ receiptHash: 'abcd'.padEnd(64, '0') }]),
            }),
          }),
        }),
      });

      const result = await getPublicBulletinBoard({ search: 'abcd' });

      expect(Vote.countDocuments).toHaveBeenCalledWith({
        receiptHash: { $regex: 'abcd', $options: 'i' },
      });
      expect(result.totalVotes).toBe(1);
    });
  });

  describe('verifyVoteReceipt', () => {
    it('successfully verifies a valid, untampered receipt', async () => {
      const encryptedVote = 'enc_vote_data_sample';
      const iv = 'abcdef0123456789abcdef0123456789';
      const candidateId = 'CAND_42';
      const receiptHash = hashValue(`${encryptedVote}:${iv}:${candidateId}`).toLowerCase();

      const mockDbRecord = {
        _id: 'mongo_vote_id_1',
        encryptedVote,
        iv,
        candidateId,
        receiptHash,
        timestamp: new Date('2026-10-01T12:00:00Z'),
      };

      Vote.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDbRecord),
      });

      const result = await verifyVoteReceipt(receiptHash);

      expect(result.valid).toBe(true);
      expect(result.code).toBe(VERIFICATION_CODES.VOTE_INCLUDED);
      expect(result.status).toBe('Vote included');
      expect(result.receiptHash).toBe(receiptHash);
      expect(result.candidateId).toBe(candidateId);
    });

    it('rejects receipt if not found in database', async () => {
      const nonExistentHash = crypto.createHash('sha256').update('unregistered').digest('hex');

      Vote.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await verifyVoteReceipt(nonExistentHash);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VERIFICATION_CODES.RECEIPT_NOT_FOUND);
      expect(result.status).toBe('Not verified');
    });

    it('rejects invalid or malformed receipt hash without database query', async () => {
      const invalidHash = 'bad_short_hash';

      const result = await verifyVoteReceipt(invalidHash);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VERIFICATION_CODES.INVALID_FORMAT);
      expect(Vote.findOne).not.toHaveBeenCalled();
    });

    it('detects tampering and rejects if database content does not match receipt hash', async () => {
      const encryptedVote = 'tampered_encrypted_payload';
      const iv = 'iv1234567890';
      const candidateId = 'CAND_1';
      // Original receipt hash for some other vote
      const fakeClaimedReceiptHash = crypto.createHash('sha256').update('original').digest('hex');

      const mockDbRecord = {
        encryptedVote,
        iv,
        candidateId,
        receiptHash: fakeClaimedReceiptHash,
        timestamp: new Date(),
      };

      Vote.findOne = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockDbRecord),
      });

      const result = await verifyVoteReceipt(fakeClaimedReceiptHash);

      expect(result.valid).toBe(false);
      expect(result.code).toBe(VERIFICATION_CODES.INTEGRITY_FAILED);
      expect(result.status).toBe('Tampered vote record');
    });
  });

  describe('getBulletinBoardStats', () => {
    it('returns total count and latest vote timestamp', async () => {
      const latestTime = new Date('2026-10-07T14:30:00Z');
      Vote.countDocuments = jest.fn().mockResolvedValue(42);
      Vote.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ timestamp: latestTime }),
        }),
      });

      const stats = await getBulletinBoardStats();

      expect(stats.totalVotes).toBe(42);
      expect(stats.latestVoteTimestamp).toEqual(latestTime);
    });
  });
});
