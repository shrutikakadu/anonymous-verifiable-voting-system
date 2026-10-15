/**
 * tests/security/otpBypass.test.js
 * ---------------------------------
 * Part 10: Security Tests — OTP Verification Enforcement & Bypass Prevention
 *
 * Validates Cryptography & Network Security (CNS) Concepts:
 *  - Multi-Factor Authentication (MFA / 2FA via OTP)
 *  - Authentication Barrier (Voting token issuance blocked without verified OTP)
 *  - Single-Use OTP / Replay Resistance (OTP code cleared upon verification)
 *  - Input Validation & Non-Existent Account Handling
 */

'use strict';

const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ── Mock Mongoose models ─────────────────────────────────────────────────────
jest.mock('../../backend/models/Voter');
jest.mock('../../backend/models/VotingToken');
jest.mock('../../backend/models/RevokedToken', () => ({
  exists: jest.fn().mockResolvedValue(false),
}), { virtual: true });

const Voter = require('../../backend/models/Voter');
const VotingToken = require('../../backend/models/VotingToken');
const RevokedToken = require('../../backend/models/RevokedToken');

// ── Mock key pair for token generation ───────────────────────────────────────
const { privateKey: mockServerPrivateKey, publicKey: mockServerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn((filePath, encoding) => {
      if (typeof filePath === 'string' && filePath.includes('public.pem')) {
        return mockServerPublicKey;
      }
      if (typeof filePath === 'string' && filePath.includes('private.pem')) {
        return mockServerPrivateKey;
      }
      return actualFs.readFileSync(filePath, encoding);
    }),
  };
});

const app = require('../../backend/app');
const { jwtSecret } = require('../../backend/config/keys');

describe('Security Tests: OTP Verification Enforcement & Bypass Prevention', () => {
  const voterMongoId = 'voter_mongo_otp_01';
  const voterId = 'VOTER_OTP_001';
  let voterJwt;

  beforeAll(() => {
    voterJwt = jwt.sign({ sub: voterMongoId, role: 'voter', voterId, otp: true }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    RevokedToken.exists.mockResolvedValue(false);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Token Generation Gated Behind OTP Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Token Issuance Gating (POST /api/token/generate)', () => {
    it('❌ Rejects voter JWT lacking verified OTP claim at middleware gateway (HTTP 401)', async () => {
      const unverifiedVoterJwt = jwt.sign(
        { sub: voterMongoId, role: 'voter', voterId },
        jwtSecret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/token/generate')
        .set('Authorization', `Bearer ${unverifiedVoterJwt}`)
        .send();

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('OTP verification required');
      expect(VotingToken.create).not.toHaveBeenCalled();
    });

    it('❌ Blocks token generation with HTTP 403 if voter has NOT verified OTP (otpVerified = false)', async () => {
      // Mock voter who logged in but never entered OTP
      Voter.findById.mockResolvedValue({
        _id: voterMongoId,
        voterId,
        otpVerified: false, // OTP NOT verified!
        isEligible: true,
        hasReceivedToken: false,
      });

      const res = await request(app)
        .post('/api/token/generate')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('OTP verification required');
      expect(VotingToken.create).not.toHaveBeenCalled();
    });

    it('✅ Allows token generation once voter has successfully verified OTP (otpVerified = true)', async () => {
      Voter.findById.mockResolvedValue({
        _id: voterMongoId,
        voterId,
        otpVerified: true, // OTP verified!
        isEligible: true,
        hasReceivedToken: false,
      });

      Voter.findOneAndUpdate.mockResolvedValue({
        _id: voterMongoId,
        hasReceivedToken: true,
      });

      VotingToken.create.mockResolvedValue({
        tokenHash: 'dummy_hash',
        used: false,
      });

      const res = await request(app)
        .post('/api/token/generate')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.signature).toBeDefined();
      expect(VotingToken.create).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. OTP Verification Endpoint Security (POST /api/auth/verify-otp)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. OTP Verification Input Validation & Integrity (POST /api/auth/verify-otp)', () => {
    it('❌ Returns HTTP 401 when attacker provides incorrect OTP code', async () => {
      const correctOtpHash = await bcrypt.hash('849201', 10);
      const mockVoterDoc = {
        _id: voterMongoId,
        voterId,
        otpHash: correctOtpHash,
        otpPurpose: 'login',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0,
        emailVerified: true,
        otpVerified: false,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      Voter.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVoterDoc),
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ voterId, otpCode: '999999', purpose: 'login' }); // Wrong OTP!

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid OTP');
      expect(mockVoterDoc.save).toHaveBeenCalled();
    });

    it('❌ Returns HTTP 400 when voterId, otpCode, or purpose is missing', async () => {
      const res1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ voterId, purpose: 'login' }); // Missing otpCode

      expect(res1.status).toBe(400);
      expect(res1.body.message).toContain('required');

      const res2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ otpCode: '123456', purpose: 'login' }); // Missing voterId

      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('required');

      const res3 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ voterId, otpCode: '123456' }); // Missing purpose

      expect(res3.status).toBe(400);
      expect(res3.body.message).toContain('required');
    });

    it('❌ Returns HTTP 401 when verifying OTP for non-existent voter (anti-enumeration)', async () => {
      Voter.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ voterId: 'NON_EXISTENT_ID', otpCode: '123456', purpose: 'login' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired OTP');
    });

    it('❌ Prevents OTP Replay: Re-submitting the same OTP after successful verification is rejected (HTTP 401)', async () => {
      // Step 1: First verification succeeds and clears otpHash to null
      const correctOtp = '582914';
      const otpHash = await bcrypt.hash(correctOtp, 10);
      const mockVoterDoc = {
        _id: voterMongoId,
        voterId,
        otpHash,
        otpPurpose: 'login',
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0,
        emailVerified: true,
        otpVerified: false,
        save: jest.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };
      Voter.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVoterDoc),
      });

      const res1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ voterId, otpCode: correctOtp, purpose: 'login' });

      expect(res1.status).toBe(200);
      expect(mockVoterDoc.otpVerified).toBe(true);
      expect(mockVoterDoc.otpHash).toBeNull(); // Cleared from database!
      expect(mockVoterDoc.save).toHaveBeenCalled();

      // Step 2: Attacker replays the same OTP '582914' against the voter record (where otpHash is now null)
      Voter.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockVoterDoc),
      });

      const res2 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ voterId, otpCode: correctOtp, purpose: 'login' });

      expect(res2.status).toBe(401);
      expect(res2.body.message).toBe('Invalid or expired OTP');
    });
  });
});
