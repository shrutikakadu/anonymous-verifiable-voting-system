/**
 * security/fakeToken.test.js
 * ----------------------------
 * Part 4 (Arya Akhade): Security Tests — Fake, Forged, Tampered & Unissued Tokens
 *
 * Validates CNS Security Concepts:
 *  - RSA Digital Signature Verification & Integrity
 *  - Authentication & Access Control (rejection of forged tokens)
 *  - Defense Against Client-Supplied Public Key Injection Attacks
 *  - Detection of Tampered Token Payloads
 *  - Detection of Unissued / Unregistered Tokens
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

// Attacker key pair (different key pair)
const { privateKey: attackerPrivateKey, publicKey: attackerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const signWithKey = (tokenStr, privKey) => {
  const signer = crypto.createSign('sha256');
  signer.update(tokenStr);
  signer.end();
  return signer.sign(privKey, 'base64');
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

describe('Part 4 (Arya Akhade): Security Tests — Fake & Forged Token Rejection', () => {
  const voterId = 'test_voter_fake_token_suite';
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
  describe('1. Forged RSA Signatures', () => {
    it('rejects a token signed with an attacker private key at /api/token/verify (HTTP 401)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const forgedSignature = signWithKey(rawToken, attackerPrivateKey);

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature: forgedSignature });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('SIGNATURE_INVALID');
      expect(res.body.message).toContain('RSA signature is invalid');
    });

    it('rejects a client-supplied public key injection attack (HTTP 401)', async () => {
      // Attacker signs with their private key and sends their public key in body,
      // attempting to trick server into validating with the attacker's key.
      const rawToken = crypto.randomBytes(32).toString('hex');
      const forgedSignature = signWithKey(rawToken, attackerPrivateKey);

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({
          token: rawToken,
          signature: forgedSignature,
          publicKey: attackerPublicKey, // Injected key should be IGNORED
        });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('SIGNATURE_INVALID');
    });

    it('rejects completely random / garbage signature (HTTP 401)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const garbageSignature = crypto.randomBytes(256).toString('base64');

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature: garbageSignature });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('SIGNATURE_INVALID');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('2. Tampered Token Payloads', () => {
    it('rejects token when contents are modified after signing (HTTP 401)', async () => {
      const originalToken = crypto.randomBytes(32).toString('hex');
      const validSignature = signWithKey(originalToken, serverPrivateKey);
      const tamperedToken = originalToken.slice(0, -2) + 'ff';

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: tamperedToken, signature: validSignature });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('SIGNATURE_INVALID');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('3. Unissued / Unregistered Tokens', () => {
    it('rejects a correctly signed token that does not exist in VotingToken collection (HTTP 401)', async () => {
      const unissuedToken = crypto.randomBytes(32).toString('hex');
      const signature = signWithKey(unissuedToken, serverPrivateKey);

      VotingToken.findOne.mockResolvedValue(null); // Not in database

      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: unissuedToken, signature });

      expect(res.status).toBe(401);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('TOKEN_NOT_FOUND');
      expect(res.body.message).toContain('not issued by our system');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('4. Missing & Malformed Inputs', () => {
    it('rejects request missing token or signature with HTTP 400 MISSING_FIELDS', async () => {
      const res = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: 'test-token-without-signature' });

      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.code).toBe('MISSING_FIELDS');
      expect(res.body.message).toContain('required fields');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('5. Vote Submission Pipeline Protection', () => {
    it('rejects fake token at /api/vote/cast before creating any vote (HTTP 401)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const fakeSignature = signWithKey(rawToken, attackerPrivateKey);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({
          token: rawToken,
          signature: fakeSignature,
          candidateId: 'c1',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('SIGNATURE_INVALID');
      expect(Vote.create).not.toHaveBeenCalled();
    });
  });
});
