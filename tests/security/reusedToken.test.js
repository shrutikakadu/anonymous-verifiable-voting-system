/**
 * security/reusedToken.test.js
 * ------------------------------
 * Part 4 (Arya Akhade): Security Tests — Replay Attacks & Double-Vote Prevention
 *
 * Validates CNS Security Concepts:
 *  - Double-Vote Prevention (Single-use token consumption)
 *  - Replay Attack Mitigation (Detection of reused tokens)
 *  - Race Condition Defense (Atomic consumption via MongoDB findOneAndUpdate)
 *  - Multi-Layer Protection (Token-level consumption + Voter-level hasVoted guard)
 */

'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Generate real RSA Keypair for server testing ────────────────────────────
const { privateKey: serverPrivateKey, publicKey: mockServerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const signToken = (tokenStr) => {
  const signer = crypto.createSign('sha256');
  signer.update(tokenStr);
  signer.end();
  return signer.sign(serverPrivateKey, 'base64');
};

const hashToken = (tokenStr) => crypto.createHash('sha256').update(tokenStr).digest('hex');

// ── Mock KeyManager & FS to provide test RSA public key ─────────────────────
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn((path, encoding) => {
      if (typeof path === 'string' && path.includes('public.pem')) {
        return mockServerPublicKey;
      }
      return actualFs.readFileSync(path, encoding);
    }),
  };
});

// ── Mock Mongoose Models ───────────────────────────────────────────────────
jest.mock('../../backend/models/VotingToken');
jest.mock('../../backend/models/Vote');
jest.mock('../../backend/models/Voter');
jest.mock('../../backend/models/RevokedToken', () => ({
  exists: jest.fn().mockResolvedValue(null),
}));

const VotingToken = require('../../backend/models/VotingToken');
const Vote = require('../../backend/models/Vote');
const Voter = require('../../backend/models/Voter');
const { jwtSecret } = require('../../backend/config/keys');
const app = require('../../backend/app');

describe('Part 4 (Arya Akhade): Security Tests — Reused Token & Double-Vote Prevention', () => {
  const voterId = 'test_voter_reused_suite';
  let validJwt;

  beforeAll(() => {
    validJwt = jwt.sign(
  { sub: voterId, role: 'voter', otp: true },
  jwtSecret,
  { expiresIn: '1h' }
);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('1. Replay Attack Detection at /api/token/verify', () => {
    it('rejects an already-used token with HTTP 409 TOKEN_ALREADY_USED', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);
      const usedAt = new Date('2026-03-01T12:00:00Z');

      // Database returns token with used: true
      VotingToken.findOne.mockResolvedValue({
        tokenHash,
        used: true,
        usedAt,
      });

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature });

      expect(res.status).toBe(409);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('TOKEN_ALREADY_USED');
      expect(res.body.message).toContain('already been used');
      expect(res.body.usedAt).toBe(usedAt.toISOString());
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('2. Replay Attack Prevention at /api/token/mark-used', () => {
    it('returns HTTP 200 when marking an unused token', async () => {
      const tokenHash = hashToken(crypto.randomBytes(32).toString('hex'));

      // findOneAndUpdate succeeds on unused token
      VotingToken.findOneAndUpdate.mockResolvedValue({
        tokenHash,
        used: true,
        usedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ tokenHash });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('successfully marked as used');
      expect(res.body.tokenHash).toBe(tokenHash);
    });

    it('returns HTTP 409 when attempting to mark an already-used token', async () => {
      const tokenHash = hashToken(crypto.randomBytes(32).toString('hex'));

      // findOneAndUpdate returns null (race condition / already marked)
      VotingToken.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ tokenHash });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('TOKEN_ALREADY_USED');
      expect(res.body.message).toContain('double-vote attempt detected');
    });

    it('rejects missing or malformed tokenHash at /api/token/mark-used (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/token/mark-used')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ tokenHash: 'invalid-non-hex-hash' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('64-character hexadecimal string');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('3. Race Condition / Concurrency Simulation', () => {
    it('allows only one of two concurrent requests to mark the token as used', async () => {
      const tokenHash = hashToken(crypto.randomBytes(32).toString('hex'));

      // Simulate atomic findOneAndUpdate: first call matches document, second call matches null
      VotingToken.findOneAndUpdate
        .mockResolvedValueOnce({ tokenHash, used: true })
        .mockResolvedValueOnce(null);

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/token/mark-used')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({ tokenHash }),
        request(app)
          .post('/api/token/mark-used')
          .set('Authorization', `Bearer ${validJwt}`)
          .send({ tokenHash }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('4. Multi-Layer Protection: Voter-Level Lockout', () => {
    it('blocks voter with hasVoted=true even if presenting a fresh token (HTTP 403)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      // Token itself is fresh in DB
      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });

      // Voter account has already voted
      Voter.findById.mockResolvedValue({
        _id: voterId,
        hasVoted: true,
      });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({
          token: rawToken,
          signature,
          candidateId: 'c1',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('ballot has already been submitted for this account');
      expect(Vote.create).not.toHaveBeenCalled();
    });
  });
});
