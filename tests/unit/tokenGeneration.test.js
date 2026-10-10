'use strict';

/**
 * tests/unit/tokenGeneration.test.js
 * ------------------------------------
 * Part 3: RSA Anonymous Voting Token — Unit Tests
 *
 * Tests the generateToken controller in isolation using mocked dependencies.
 * No real database, filesystem, or HTTP server is used.
 *
 * Scenarios covered:
 *   ✅  Eligible, OTP-verified voter receives a valid token response
 *   ❌  Voter not found → 404
 *   ❌  OTP not verified → 403
 *   ❌  Voter not eligible → 403
 *   ❌  Token already issued (duplicate) → 409
 *   ✅  Raw token is NOT the same as tokenHash (hash is stored, not raw)
 *   ✅  Signature is verifiable with the returned public key (RSA-SHA256)
 *   ✅  generateSecureToken produces 64-char hex strings
 *   ✅  hashToken is a deterministic SHA-256 hex digest
 *   ✅  signToken + verifyTokenSignature round-trips correctly with SPKI/PKCS8 keys
 */

const crypto = require('crypto');

// ── Generate a test RSA key pair (SPKI/PKCS8, matching rsa.js and keyManager) ──
const { privateKey: TEST_PRIVATE_KEY, publicKey: TEST_PUBLIC_KEY } =
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

// ── Mock heavy dependencies before requiring the controller ────────────────────

jest.mock('../../backend/models/Voter');
jest.mock('../../backend/models/VotingToken');
jest.mock('fs');
jest.mock('../../backend/crypto/keyManager', () => ({
  ensureKeyFiles:  jest.fn(),
  getKeyPairPaths: jest.fn(() => ({
    privateKeyPath: '/fake/private.pem',
    publicKeyPath:  '/fake/public.pem',
  })),
}));

const fs         = require('fs');
const Voter      = require('../../backend/models/Voter');
const VotingToken = require('../../backend/models/VotingToken');

// Make fs.readFileSync return our test keys
fs.readFileSync.mockImplementation((filePath) => {
  if (filePath === '/fake/private.pem') return TEST_PRIVATE_KEY;
  if (filePath === '/fake/public.pem')  return TEST_PUBLIC_KEY;
  throw new Error(`Unexpected readFileSync: ${filePath}`);
});

// ── Import the controller + service functions under test ───────────────────────
const { generateToken } = require('../../backend/controllers/tokenController');
const { generateSecureToken, signToken, verifyTokenSignature, hashToken } =
  require('../../backend/services/tokenService');

// ── Helper: build a minimal mock req/res/next ─────────────────────────────────
const makeReq = () => ({
  user: { sub: 'voter-mongo-id-123', role: 'voter', voterId: 'V001' },
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

// ── Baseline voter document (eligible, OTP verified, no token yet) ─────────────
const eligibleVoter = {
  _id:              'voter-mongo-id-123',
  name:             'Test Voter',
  voterId:          'V001',
  isEligible:       true,
  otpVerified:      true,
  hasReceivedToken: false,
  hasVoted:         false,
};

// ─────────────────────────────────────────────────────────────────────────────
describe('Part 3 — RSA Anonymous Voting Token: generateToken controller', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Default happy-path mocks
    Voter.findById.mockResolvedValue({ ...eligibleVoter });
    Voter.findOneAndUpdate.mockResolvedValue({ ...eligibleVoter }); // claimed
    VotingToken.create.mockResolvedValue({});
  });

  // ── Happy path ─────────────────────────────────────────────────────────────
  describe('✅ Successful token issuance', () => {

    test('returns 201 with token, signature, publicKey, and tokenHash', async () => {
      const req  = makeReq();
      const res  = makeRes();
      const next = jest.fn();

      await generateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = res.json.mock.calls[0][0];
      expect(body.message).toBe('Anonymous voting token generated');
      expect(typeof body.token).toBe('string');
      expect(typeof body.signature).toBe('string');
      expect(typeof body.publicKey).toBe('string');
      expect(typeof body.tokenHash).toBe('string');
      expect(next).not.toHaveBeenCalled();
    });

    test('raw token is a 64-character hex string (32 bytes)', async () => {
      const req = makeReq();
      const res = makeRes();
      await generateToken(req, res, jest.fn());

      const { token } = res.json.mock.calls[0][0];
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    test('tokenHash is the SHA-256 of the raw token (not the raw token itself)', async () => {
      const req = makeReq();
      const res = makeRes();
      await generateToken(req, res, jest.fn());

      const { token, tokenHash } = res.json.mock.calls[0][0];
      expect(tokenHash).not.toBe(token);
      expect(tokenHash).toBe(
        crypto.createHash('sha256').update(token).digest('hex')
      );
    });

    test('signature is verifiable with the returned public key (RSA-SHA256)', async () => {
      const req = makeReq();
      const res = makeRes();
      await generateToken(req, res, jest.fn());

      const { token, signature, publicKey } = res.json.mock.calls[0][0];
      const verifier = crypto.createVerify('sha256');
      verifier.update(token);
      verifier.end();
      expect(verifier.verify(publicKey, signature, 'base64')).toBe(true);
    });

    test('private key is NOT included in the response', async () => {
      const req = makeReq();
      const res = makeRes();
      await generateToken(req, res, jest.fn());

      const body = res.json.mock.calls[0][0];
      expect(Object.keys(body)).not.toContain('privateKey');
      // The response publicKey should NOT contain any private key markers
      expect(body.publicKey).not.toContain('PRIVATE');
    });

    test('VotingToken.create is called with tokenHash and used:false (never raw token)', async () => {
      const req = makeReq();
      const res = makeRes();
      await generateToken(req, res, jest.fn());

      const { tokenHash } = res.json.mock.calls[0][0];
      expect(VotingToken.create).toHaveBeenCalledWith({ tokenHash, used: false });
      // Confirm the raw token was NOT passed to VotingToken.create
      const createArg = VotingToken.create.mock.calls[0][0];
      expect(createArg.token).toBeUndefined();
    });

    test('Voter.findOneAndUpdate is called with correct atomic filter', async () => {
      const req = makeReq();
      await generateToken(req, makeRes(), jest.fn());

      expect(Voter.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'voter-mongo-id-123', hasReceivedToken: false },
        { $set: { hasReceivedToken: true } },
        { new: false }
      );
    });
  });

  // ── Eligibility failures ───────────────────────────────────────────────────
  describe('❌ Rejection cases', () => {

    test('returns 404 when voter does not exist', async () => {
      Voter.findById.mockResolvedValue(null);
      const res = makeRes();

      await generateToken(makeReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json.mock.calls[0][0].message).toMatch(/not found/i);
    });

    test('returns 403 when voter has not verified OTP', async () => {
      Voter.findById.mockResolvedValue({ ...eligibleVoter, otpVerified: false });
      const res = makeRes();

      await generateToken(makeReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].message).toMatch(/otp/i);
    });

    test('returns 403 when voter is not eligible', async () => {
      Voter.findById.mockResolvedValue({ ...eligibleVoter, isEligible: false });
      const res = makeRes();

      await generateToken(makeReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].message).toMatch(/eligible/i);
    });

    test('returns 409 when voter already received a token (duplicate issuance)', async () => {
      // findOneAndUpdate returns null → atomic claim failed → already issued
      Voter.findOneAndUpdate.mockResolvedValue(null);
      const res = makeRes();

      await generateToken(makeReq(), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json.mock.calls[0][0].message).toMatch(/already been issued/i);
    });

    test('409 is returned even for concurrent duplicate requests', async () => {
      // First call claims the token, second call finds nothing
      Voter.findOneAndUpdate
        .mockResolvedValueOnce({ ...eligibleVoter }) // first request: claims
        .mockResolvedValueOnce(null);                // second request: too late

      const req1 = makeReq();
      const req2 = makeReq();
      const res1 = makeRes();
      const res2 = makeRes();

      await Promise.all([
        generateToken(req1, res1, jest.fn()),
        generateToken(req2, res2, jest.fn()),
      ]);

      const statuses = [
        res1.status.mock.calls[0][0],
        res2.status.mock.calls[0][0],
      ].sort();

      expect(statuses).toEqual([201, 409]);
    });

    test('forwards unexpected errors to next()', async () => {
      Voter.findById.mockRejectedValue(new Error('DB connection lost'));
      const next = jest.fn();

      await generateToken(makeReq(), makeRes(), next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Part 3 — tokenService: crypto utility functions', () => {

  // ── generateSecureToken ────────────────────────────────────────────────────
  describe('generateSecureToken', () => {

    test('returns a 64-character lowercase hex string', () => {
      const token = generateSecureToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    test('each call returns a different value (randomness)', () => {
      const tokens = new Set(Array.from({ length: 10 }, generateSecureToken));
      expect(tokens.size).toBe(10);
    });
  });

  // ── hashToken ──────────────────────────────────────────────────────────────
  describe('hashToken', () => {

    test('returns a 64-character hex string (SHA-256 output)', () => {
      expect(hashToken('any-input')).toMatch(/^[0-9a-f]{64}$/);
    });

    test('is deterministic — same input gives same hash', () => {
      expect(hashToken('hello')).toBe(hashToken('hello'));
    });

    test('differs for different inputs', () => {
      expect(hashToken('a')).not.toBe(hashToken('b'));
    });
  });

  // ── signToken + verifyTokenSignature ───────────────────────────────────────
  describe('signToken + verifyTokenSignature', () => {

    test('✅ signature verifies correctly with matching key pair (SPKI/PKCS8)', () => {
      const token     = generateSecureToken();
      const signature = signToken(token, TEST_PRIVATE_KEY);
      expect(verifyTokenSignature(token, signature, TEST_PUBLIC_KEY)).toBe(true);
    });

    test('❌ signature fails with wrong public key', () => {
      const { publicKey: otherPublicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      const token     = generateSecureToken();
      const signature = signToken(token, TEST_PRIVATE_KEY);
      expect(verifyTokenSignature(token, signature, otherPublicKey)).toBe(false);
    });

    test('❌ signature fails when token content is modified (integrity check)', () => {
      const token     = generateSecureToken();
      const signature = signToken(token, TEST_PRIVATE_KEY);
      const tampered  = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
      expect(verifyTokenSignature(tampered, signature, TEST_PUBLIC_KEY)).toBe(false);
    });
  });
});
