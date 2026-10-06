/**
 * security/tokenReplayAttack.test.js
 * ------------------------------------
 * Part 4 (Arya Akhade): Security Tests — Replay Attack & Token Tampering
 *
 * Simulates adversarial scenarios:
 *   - An attacker tries to vote twice with the same token
 *   - An attacker crafts a fake RSA signature
 *   - An attacker modifies the token content after signing
 *   - An attacker generates their own key pair and tries to pass it off
 *   - Concurrent requests with the same token (race condition)
 *
 * These tests validate the CNS concepts:
 *   - Replay Attack Prevention
 *   - Digital Signature Integrity
 *   - Authentication
 *   - Access Control
 */

'use strict';

const crypto = require('crypto');

// ── Key setup ─────────────────────────────────────────────────────────────────
const { privateKey: serverPrivateKey, publicKey: serverPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const { privateKey: attackerPrivateKey, publicKey: attackerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ── Mock VotingToken model ─────────────────────────────────────────────────────
jest.mock('../../backend/models/VotingToken');
const VotingToken = require('../../backend/models/VotingToken');

// ── Mock tokenService with server keys ─────────────────────────────────────────
jest.mock('../../backend/services/tokenService', () => {
  const crypto = require('crypto');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    signToken: (token, privKey) => {
      const s = crypto.createSign('sha256');
      s.update(token);
      s.end();
      return s.sign(privKey, 'base64');
    },
    verifyTokenSignature: (token, sig, pubKey) => {
      try {
        const v = crypto.createVerify('sha256');
        v.update(token);
        v.end();
        return v.verify(pubKey, sig, 'base64');
      } catch { return false; }
    },
    hashToken: (token) => crypto.createHash('sha256').update(token).digest('hex'),
    _testKeys: { privateKey, publicKey },
  };
});

const { verifyVotingToken, markTokenAsUsed, VERIFY_RESULT } = require('../../backend/services/tokenVerificationService');
const tokenService = require('../../backend/services/tokenService');
const { _testKeys: serverKeys } = tokenService;

// ── Helpers ────────────────────────────────────────────────────────────────────
const sign = (token, privKey) => {
  const s = crypto.createSign('sha256');
  s.update(token);
  s.end();
  return s.sign(privKey, 'base64');
};

const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');

// ─────────────────────────────────────────────────────────────────────────────
describe('Part 4 — Security Tests: Replay Attack & Tampering', () => {

  beforeEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  describe('Attack 1: Double-Vote (Replay Attack)', () => {

    test('❌ Second use of same valid token is rejected', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const sig = tokenService.signToken(token, serverKeys.privateKey);
      const tokenHash = hash(token);

      // First call: token is unused
      VotingToken.findOne.mockResolvedValueOnce({ tokenHash, used: false, usedAt: null });
      const firstResult = await verifyVotingToken(token, sig, serverKeys.publicKey);
      expect(firstResult.code).toBe(VERIFY_RESULT.VALID);

      // Simulate marking used
      VotingToken.findOneAndUpdate.mockResolvedValue({ tokenHash, used: true });
      const marked = await markTokenAsUsed(tokenHash);
      expect(marked).toBe(true);

      // Second call: token is now used → REPLAY DETECTED
      VotingToken.findOne.mockResolvedValueOnce({
        tokenHash,
        used: true,
        usedAt: new Date(),
      });
      const secondResult = await verifyVotingToken(token, sig, serverKeys.publicKey);
      expect(secondResult.code).toBe(VERIFY_RESULT.TOKEN_ALREADY_USED);
    });

    test('❌ Concurrent double-submit: markTokenAsUsed is race-condition safe', async () => {
      const tokenHash = hash(crypto.randomBytes(32).toString('hex'));

      // First concurrent call succeeds
      VotingToken.findOneAndUpdate
        .mockResolvedValueOnce({ tokenHash, used: true }) // first: succeeds
        .mockResolvedValueOnce(null);                     // second: no document matched → already used

      const [result1, result2] = await Promise.all([
        markTokenAsUsed(tokenHash),
        markTokenAsUsed(tokenHash),
      ]);

      expect(result1).toBe(true);
      expect(result2).toBe(false); // Second was too late — race condition caught
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Attack 2: Forged Signature (Fake Token)', () => {

    test('❌ Attacker signs with their own private key — rejected', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const fakeSignature = sign(token, attackerPrivateKey); // attacker's key, not server's

      const result = await verifyVotingToken(token, fakeSignature, serverKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    test('❌ Attacker passes their own public key to match their signature — rejected (hash not in DB)', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const attackerSignature = sign(token, attackerPrivateKey);
      // Signature will verify against attacker's own public key,
      // BUT the hash won't exist in our DB because we never issued it

      // The server uses its own stored public key, NOT what an attacker sends
      // Verification fails at Stage 1 (wrong public key used internally)
      const result = await verifyVotingToken(token, attackerSignature, serverKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    test('❌ Attacker uses a completely random 256-byte blob as signature', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const randomBlob = crypto.randomBytes(256).toString('base64');

      const result = await verifyVotingToken(token, randomBlob, serverKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Attack 3: Token Content Tampering', () => {

    test('❌ Attacker flips a single character in the token — signature mismatch', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const sig = tokenService.signToken(token, serverKeys.privateKey);

      // Flip first character: '0' → '1', 'a' → 'b', etc.
      const tampered = (token[0] === 'a' ? 'b' : 'a') + token.slice(1);

      const result = await verifyVotingToken(tampered, sig, serverKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });

    test('❌ Attacker appends extra characters to the token', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const sig = tokenService.signToken(token, serverKeys.privateKey);
      const tamperedToken = token + 'extra_garbage';

      const result = await verifyVotingToken(tamperedToken, sig, serverKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.SIGNATURE_INVALID);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('Attack 4: Token Hash Not in Database', () => {

    test('❌ Token has valid signature but was never registered in DB', async () => {
      const token = crypto.randomBytes(32).toString('hex');
      const sig = tokenService.signToken(token, serverKeys.privateKey);

      VotingToken.findOne.mockResolvedValue(null); // not in DB

      const result = await verifyVotingToken(token, sig, serverKeys.publicKey);
      expect(result.code).toBe(VERIFY_RESULT.TOKEN_NOT_FOUND);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  describe('VERIFY_RESULT codes — contract', () => {

    test('All expected result codes are exported', () => {
      expect(VERIFY_RESULT.VALID).toBe('VALID');
      expect(VERIFY_RESULT.MISSING_FIELDS).toBe('MISSING_FIELDS');
      expect(VERIFY_RESULT.SIGNATURE_INVALID).toBe('SIGNATURE_INVALID');
      expect(VERIFY_RESULT.TOKEN_NOT_FOUND).toBe('TOKEN_NOT_FOUND');
      expect(VERIFY_RESULT.TOKEN_ALREADY_USED).toBe('TOKEN_ALREADY_USED');
      expect(VERIFY_RESULT.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });
  });

}); // end describe
