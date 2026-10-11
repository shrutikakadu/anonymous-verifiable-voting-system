/**
 * tests/security/reusedToken.test.js
 * -----------------------------------
 * Part 10 & Part 4: Security Tests — Token Reuse & Double-Voting Prevention
 *
 * Validates Cryptography & Network Security (CNS) Concepts:
 *  - Double-Vote Prevention (Single-use token consumption)
 *  - Replay Attack Mitigation (Detection of reused tokens)
 *  - Race Condition Defense (Atomic consumption via MongoDB findOneAndUpdate)
 *  - Account-level Single-Vote Invariant (hasVoted flag)
 *  - Duplicate Token Issuance Prevention (hasReceivedToken atomic flag)
 *  - Multi-Layer Protection (Token-level consumption + Voter-level hasVoted guard)
 */

'use strict';

const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// ── Mock Mongoose models ─────────────────────────────────────────────────────
jest.mock('../../backend/models/VotingToken');
jest.mock('../../backend/models/Voter');
jest.mock('../../backend/models/Vote');

const VotingToken = require('../../backend/models/VotingToken');
const Voter = require('../../backend/models/Voter');
const Vote = require('../../backend/models/Vote');

// ── Real RSA key pair for testing (prefixed with mock for Jest scope) ────────
const { privateKey: mockServerPrivateKey, publicKey: mockServerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const sign = (tokenStr, privKey = mockServerPrivateKey) => {
  const signer = crypto.createSign('sha256');
  signer.update(tokenStr);
  signer.end();
  return signer.sign(privKey, 'base64');
};

const signToken = (tokenStr) => sign(tokenStr, mockServerPrivateKey);
const hashToken = (tokenStr) => crypto.createHash('sha256').update(tokenStr).digest('hex');

// ── Mock fs to return our trusted server keys ────────────────────────────────
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
const { VERIFY_RESULT } = require('../../backend/services/tokenVerificationService');

describe('Security Tests: Token Reuse and Double-Voting Prevention', () => {
  const testVoterId = 'voter_security_test_02';
  let voterJwt;
  const validAesKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(() => {
    process.env.AES_SECRET_KEY = validAesKey;
    voterJwt = jwt.sign({ sub: testVoterId, role: 'voter' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Voter.findById.mockResolvedValue({
      _id: testVoterId,
      hasVoted: false,
      otpVerified: true,
      isEligible: true,
      hasReceivedToken: false,
      save: jest.fn(),
    });
    Vote.findOne.mockResolvedValue(null);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Replay Attack Detection at /api/token/verify
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Token Replay in Verification Endpoint (/api/token/verify)', () => {
    it('❌ Returns HTTP 409 TOKEN_ALREADY_USED when verifying a previously used token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);
      const usedTimestamp = new Date('2026-10-10T10:00:00Z');

      VotingToken.findOne.mockResolvedValue({
        tokenHash,
        used: true,
        usedAt: usedTimestamp,
      });

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ token: rawToken, signature, publicKey: mockServerPublicKey });

      expect(res.status).toBe(409);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe(VERIFY_RESULT.TOKEN_ALREADY_USED);
      expect(res.body.message).toContain('already been used');
      expect(res.body.usedAt).toBe(usedTimestamp.toISOString());
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Direct Token Consumption Endpoint (/api/token/mark-used)
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Direct Token Consumption Endpoint (/api/token/mark-used)', () => {
    it('✅ Returns HTTP 200 when successfully marking an unused token', async () => {
      const tokenHash = hashToken(crypto.randomBytes(32).toString('hex'));

      // findOneAndUpdate succeeds on unused token
      VotingToken.findOneAndUpdate.mockResolvedValue({
        tokenHash,
        used: true,
        usedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ tokenHash });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('successfully marked as used');
      expect(res.body.tokenHash).toBe(tokenHash);
    });

    it('❌ Returns HTTP 409 when attempting to re-mark an already consumed token', async () => {
      const tokenHash = hashToken('test_token_already_consumed');

      // Atomic mark failed because token is already used
      VotingToken.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ tokenHash });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('double-vote attempt detected');
      expect(res.body.code).toBe(VERIFY_RESULT.TOKEN_ALREADY_USED);
    });

    it('❌ Returns HTTP 400 when tokenHash is missing', async () => {
      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('tokenHash is required');
    });

    it('❌ Rejects missing or malformed tokenHash at /api/token/mark-used (HTTP 400 non-hex)', async () => {
      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ tokenHash: 'invalid-non-hex-hash' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('64-character hexadecimal string');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Race Condition / Concurrency Simulation on mark-used
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Race Condition / Concurrency Simulation (/api/token/mark-used)', () => {
    it('❌ Allows only one of two concurrent requests to mark the token as used', async () => {
      const tokenHash = hashToken(crypto.randomBytes(32).toString('hex'));

      // Simulate atomic findOneAndUpdate: first call matches document, second call matches null
      VotingToken.findOneAndUpdate
        .mockResolvedValueOnce({ tokenHash, used: true })
        .mockResolvedValueOnce(null);

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/token/mark-used')
          .set('Authorization', `Bearer ${voterJwt}`)
          .send({ tokenHash }),
        request(app)
          .post('/api/token/mark-used')
          .set('Authorization', `Bearer ${voterJwt}`)
          .send({ tokenHash }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Replay Attack in Vote Casting Endpoint (/api/vote/cast)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Replay Attack in Vote Casting Endpoint (/api/vote/cast)', () => {
    it('❌ Rejects second ballot submission using the same token (HTTP 409)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      // Token already marked used in database
      VotingToken.findOne.mockResolvedValue({
        tokenHash,
        used: true,
        usedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({
          token: rawToken,
          signature,
          candidateId: 'candidate_X',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(VERIFY_RESULT.TOKEN_ALREADY_USED);
      expect(res.body.message).toContain('already been used');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('❌ Prevents concurrent double-voting race conditions atomically in /api/vote/cast', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      // Stage 2 passes (findOne says unused), but atomic consumption findOneAndUpdate fails because another thread consumed it first
      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      VotingToken.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({
          token: rawToken,
          signature,
          candidateId: 'candidate_Y',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe(VERIFY_RESULT.TOKEN_ALREADY_USED);
      expect(res.body.message).toContain('already marked as used');
      expect(Vote.create).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Account-Level Double-Voting & Duplicate Token Prevention
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Account-Level Double-Voting & Duplicate Token Prevention', () => {
    it('❌ Rejects duplicate token issuance for the same voter (HTTP 409)', async () => {
      // Voter has already received a token
      Voter.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/token/generate')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send();

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already been issued');
      expect(VotingToken.create).not.toHaveBeenCalled();
    });

    it('❌ Rejects vote submission if voter account has already voted (HTTP 403)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      Voter.findById.mockResolvedValue({
        _id: testVoterId,
        hasVoted: true, // Already cast a ballot
      });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({
          token: rawToken,
          signature,
          candidateId: 'candidate_Z',
        });

      expect(res.status).toBe(403);
      // Validates both message variants preserved from HEAD and main
      expect(res.body.message).toContain('Voter cannot vote again');
      expect(res.body.message).toContain('ballot has already been submitted for this account');
      expect(Vote.create).not.toHaveBeenCalled();
    });
  });
});
