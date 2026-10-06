/**
 * unit/tokenVerification.test.js
 * --------------------------------
 * Part 4 (Arya Akhade): Unit tests for Token Verification + Double Vote Prevention
 *
 * Tests the tokenVerificationService in isolation using mocked MongoDB calls.
 * No real database or HTTP server is needed — this is pure logic testing.
 *
 * Scenarios tested:
 *   ✅ Valid token accepted
 *   ❌ Fake/tampered token (bad RSA signature) rejected
 *   ❌ Token not in database (never issued) rejected
 *   ❌ Previously used token rejected (double vote)
 *   ✅ markTokenAsUsed succeeds on fresh token
 *   ❌ markTokenAsUsed returns false on race condition (already used)
 */

'use strict';

const crypto = require('crypto');

// ── Generate a fresh RSA key pair for all tests ──────────────────────────────
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ── Helper: sign a token the same way the server does ────────────────────────
const signToken = (token, privKey) => {
  const signer = crypto.createSign('sha256');
  signer.update(token);
  signer.end();
  return signer.sign(privKey, 'base64');
};

// ── Helper: SHA-256 hash ──────────────────────────────────────────────────────
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── Mock the VotingToken model BEFORE requiring the service ───────────────────
jest.mock('../../backend/models/VotingToken');
const VotingToken = require('../../backend/models/VotingToken');

// ── Import the service under test ─────────────────────────────────────────────
// Override the internal tokenService so it uses our test keys
jest.mock('../../backend/services/tokenService', () => {
  const crypto = require('crypto');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Re-export real logic but with a known key pair
  const signFn = (token, privKey) => {
    const signer = crypto.createSign('sha256');
    signer.update(token);
    signer.end();
    return signer.sign(privKey, 'base64');
  };

  const verifyFn = (token, signature, pubKey) => {
    const verifier = crypto.createVerify('sha256');
    verifier.update(token);
    verifier.end();
    return verifier.verify(pubKey, signature, 'base64');
  };

  const hashFn = (token) => crypto.createHash('sha256').update(token).digest('hex');

  return {
    generateKeyPair: () => ({ privateKey, publicKey }),
    signToken: signFn,
    verifyTokenSignature: verifyFn,
    hashToken: hashFn,
    _testKeys: { privateKey, publicKey },
  };
});

const { verifyVotingToken, markTokenAsUsed, VERIFY_RESULT } = require('../../backend/services/tokenVerificationService');
const tokenService = require('../../backend/services/tokenService');
const { _testKeys } = tokenService;

// ─────────────────────────────────────────────────────────────────────────────
describe('Part 4 — Token Verification + Double Vote Prevention', () => {

  // ── Helper: produce a legitimately signed token ──────────────────────────
  const makeLegitToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const signature = tokenService.signToken(token, _testKeys.privateKey);
    return { token, signature, publicKey: _testKeys.publicKey };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Missing fields ──────────────────────────────────────────────────────
  describe('Input validation', () => {
    test('returns MISSING_FIELDS when token is absent', async () => {
      const result = await verifyVotingToken(null, 'sig', 'pubkey');
      expect(result.code).toBe(VERIFY_RESULT.MISSING_FIELDS);
    });

    test('returns MISSING_FIELDS when signature is absent', async () => {
      const result = await verifyVotingToken('sometoken', null, 'pubkey');
      expect(result.code).toBe(VERIFY_RESULT.MISSING_FIELDS);
    });

    test('returns MISSING_FIELDS when publicKey is absent', async () => {
      const result = await verifyVotingToken('sometoken', 'sig', null);
      expect(result.code).toBe(VERIFY_RESULT.MISSING_FIELDS);
    });
  });

  // ── 2. Fake / tampered token ──────────────────────────────────────────────
  describe('Fake token rejection (Stage 1 — RSA Signature)', () => {
    test('❌ rejects a token signed with a DIFFERENT private key', async () => {
      // Generate a second unrelated key pair — attacker's key
      const { privateKey: attackerPrivKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding:  { type: 'spki',  format: 'pem' },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const fakeSignature = signToken(token, attackerPrivKey); // signed with wrong key

      const result = await verifyVotingToken(token, fakeSignature, _testKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    test('❌ rejects a token with a randomly modified (corrupted) signature', async () => {
      const { token, publicKey: pubKey } = makeLegitToken();
      const corruptedSignature = crypto.randomBytes(256).toString('base64'); // random garbage

      const result = await verifyVotingToken(token, corruptedSignature, pubKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    test('❌ rejects a tampered token (content changed after signing)', async () => {
      const { signature, publicKey: pubKey } = makeLegitToken();
      const tamperedToken = crypto.randomBytes(32).toString('hex'); // different content

      const result = await verifyVotingToken(tamperedToken, signature, pubKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    test('❌ rejects a malformed public key', async () => {
      const { token, signature } = makeLegitToken();

      const result = await verifyVotingToken(token, signature, 'NOT_A_REAL_PEM_KEY');
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });
  });

  // ── 3. Valid signature but token NOT in database ──────────────────────────
  describe('Unrecognized token rejection (Stage 2 — DB Lookup)', () => {
    test('❌ rejects a correctly signed token that was never issued', async () => {
      VotingToken.findOne.mockResolvedValue(null); // not in DB

      const { token, signature, publicKey: pubKey } = makeLegitToken();
      const result = await verifyVotingToken(token, signature, pubKey);

      expect(result.code).toBe(VERIFY_RESULT.TOKEN_NOT_FOUND);
      expect(VotingToken.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ── 4. Double vote / Replay attack ───────────────────────────────────────
  describe('Replay attack prevention (Stage 3 — Used Flag)', () => {
    test('❌ rejects a valid token that has already been used', async () => {
      const { token, signature, publicKey: pubKey } = makeLegitToken();

      // Simulate a token record that is already marked as used
      VotingToken.findOne.mockResolvedValue({
        tokenHash: hashToken(token),
        used: true,
        usedAt: new Date('2026-01-01T10:00:00.000Z'),
      });

      const result = await verifyVotingToken(token, signature, pubKey);

      expect(result.code).toBe(VERIFY_RESULT.TOKEN_ALREADY_USED);
      expect(result.tokenRecord.used).toBe(true);
    });
  });

  // ── 5. Happy path ─────────────────────────────────────────────────────────
  describe('Valid token acceptance', () => {
    test('✅ accepts a valid, unused token with correct RSA signature', async () => {
      const { token, signature, publicKey: pubKey } = makeLegitToken();

      VotingToken.findOne.mockResolvedValue({
        tokenHash: hashToken(token),
        used: false,
        usedAt: null,
      });

      const result = await verifyVotingToken(token, signature, pubKey);

      expect(result.code).toBe(VERIFY_RESULT.VALID);
      expect(result.tokenRecord).toBeTruthy();
      expect(result.tokenRecord.used).toBe(false);
    });
  });

  // ── 6. markTokenAsUsed ───────────────────────────────────────────────────
  describe('markTokenAsUsed — atomic consumption', () => {
    test('✅ returns true when token is successfully marked as used', async () => {
      const { token } = makeLegitToken();
      const tHash = hashToken(token);

      VotingToken.findOneAndUpdate.mockResolvedValue({ tokenHash: tHash, used: true });

      const success = await markTokenAsUsed(tHash);
      expect(success).toBe(true);
      expect(VotingToken.findOneAndUpdate).toHaveBeenCalledWith(
        { tokenHash: tHash, used: false },
        { used: true, usedAt: expect.any(Date) },
        { new: true }
      );
    });

    test('❌ returns false when token was already used (race condition)', async () => {
      const { token } = makeLegitToken();
      const tHash = hashToken(token);

      // Simulate: no document matched the filter { used: false } → another request won the race
      VotingToken.findOneAndUpdate.mockResolvedValue(null);

      const success = await markTokenAsUsed(tHash);
      expect(success).toBe(false);
    });
  });

}); // end describe
