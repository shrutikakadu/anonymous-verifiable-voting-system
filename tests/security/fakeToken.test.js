/**
 * tests/security/fakeToken.test.js
 * ---------------------------------
 * Part 10: Security Tests — Forged & Fake Voting Token Detection
 *
 * Validates Cryptography & Network Security (CNS) Concepts:
 *  - Digital Signature Integrity (RSA-SHA256 signature verification)
 *  - Authentication & Authorization (Only server-issued tokens are valid)
 *  - Resistance to Forgery (Attacker keys, modified tokens, random blobs)
 *  - Strict Input Sanitization (Missing fields, malformed formats)
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

// ── Generate real RSA key pairs for testing (prefixed with mock for Jest scope) ──
const { privateKey: mockServerPrivateKey, publicKey: mockServerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const { privateKey: attackerPrivateKey, publicKey: attackerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Helper: sign token using a private key
const sign = (tokenStr, privKey) => {
  const signer = crypto.createSign('sha256');
  signer.update(tokenStr);
  signer.end();
  return signer.sign(privKey, 'base64');
};

const hashToken = (tokenStr) => crypto.createHash('sha256').update(tokenStr).digest('hex');

// ── Mock fs to return our trusted server public key ──────────────────────────
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
const { verifyVotingToken, VERIFY_RESULT } = require('../../backend/services/tokenVerificationService');

describe('Security Tests: Forged and Fake Voting Token Rejection', () => {
  const testVoterId = 'voter_security_test_01';
  let voterJwt;
  const validAesKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeAll(() => {
    process.env.AES_SECRET_KEY = validAesKey;
    voterJwt = jwt.sign({ sub: testVoterId, role: 'voter' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Voter.findById.mockResolvedValue({ _id: testVoterId, hasVoted: false, save: jest.fn() });
    Vote.findOne.mockResolvedValue(null);
  });

  describe('1. Service-Level Signature and Forgery Checks', () => {
    it('❌ Rejects token when signature was created using an attacker private key', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const forgedSignature = sign(token, attackerPrivateKey);

      const result = await verifyVotingToken(token, forgedSignature, mockServerPublicKey);

      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
      expect(result.tokenRecord).toBeNull();
    });

    it('❌ Rejects token with completely corrupted / random signature bytes', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const garbageSignature = crypto.randomBytes(256).toString('base64');

      const result = await verifyVotingToken(token, garbageSignature, mockServerPublicKey);

      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    it('❌ Rejects token when content was tampered with after legitimate signing', async () => {
      const genuineToken = crypto.randomBytes(32).toString('hex');
      const validSignature = sign(genuineToken, mockServerPrivateKey);

      // Attacker tampers with the token string
      const tamperedToken = genuineToken.slice(0, -2) + (genuineToken.endsWith('aa') ? 'bb' : 'aa');

      const result = await verifyVotingToken(tamperedToken, validSignature, mockServerPublicKey);

      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    it('❌ Rejects properly signed token that was never registered in the database', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const validSignature = sign(token, mockServerPrivateKey);

      VotingToken.findOne.mockResolvedValue(null); // Not in database

      const result = await verifyVotingToken(token, validSignature, mockServerPublicKey);

      expect(result.code).toBe(VERIFY_RESULT.TOKEN_NOT_FOUND);
    });
  });

  describe('2. API-Level Token Verification Endpoint (/api/token/verify)', () => {
    it('❌ Returns HTTP 401 when attacker presents forged signature', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const fakeSig = sign(token, attackerPrivateKey);

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ token, signature: fakeSig, publicKey: mockServerPublicKey });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    it('❌ Returns HTTP 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ token: 'some_token' }); // missing signature & publicKey

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe(VERIFY_RESULT.MISSING_FIELDS);
    });

    it('❌ Returns HTTP 401 when token has valid signature but does not exist in ledger', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const signature = sign(token, mockServerPrivateKey);

      VotingToken.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({ token, signature, publicKey: mockServerPublicKey });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe(VERIFY_RESULT.TOKEN_NOT_FOUND);
    });
  });

  describe('3. Vote Submission Endpoint (/api/vote/cast) with Forged Token', () => {
    it('❌ Rejects ballot casting when token signature is forged (HTTP 401)', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const fakeSig = sign(token, attackerPrivateKey);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({
          token,
          signature: fakeSig,
          candidateId: 'candidate_A',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('RSA signature is invalid');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('❌ Rejects ballot casting when token was never issued by the authority (HTTP 401)', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const validSig = sign(token, mockServerPrivateKey);

      VotingToken.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${voterJwt}`)
        .send({
          token,
          signature: validSig,
          candidateId: 'candidate_B',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('not issued by our system');
      expect(Vote.create).not.toHaveBeenCalled();
    });
  });
});
