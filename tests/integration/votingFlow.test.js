/**
 * tests/integration/votingFlow.test.js
 * -------------------------------------
 * Part 6 (Tanaya): Integration & End-to-End Tests for Vote Submission & Receipt Generation
 *
 * Scenarios tested:
 *  1. Successful vote submission and receipt generation
 *  2. Correct persistence of ciphertext, IV, authentication tag, and receipt hash
 *  3. Verification of generated receipt using Member 7's verifier (verifyVoteReceipt)
 *  4. Rejection of invalid / forged token signature (401)
 *  5. Rejection of unissued / unknown token (401)
 *  6. Rejection of already-used token (409 Replay Attack)
 *  7. Concurrent submissions using the same token (Race Condition Prevention)
 *  8. Rejection when AES key is invalid / missing (500)
 *  9. Rollback of token consumption upon database persistence failure
 * 10. Rejection of duplicate voting by an authenticated voter whose account already voted (403)
 */

'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// ── Generate real RSA Keypair for server testing ────────────────────────────
const { privateKey: mockServerPrivateKey, publicKey: mockServerPublicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Helper: sign token using server private key
const signToken = (tokenStr) => {
  const signer = crypto.createSign('sha256');
  signer.update(tokenStr);
  signer.end();
  return signer.sign(mockServerPrivateKey, 'base64');
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
      if (typeof path === 'string' && path.includes('private.pem')) {
        return mockServerPrivateKey;
      }
      return actualFs.readFileSync(path, encoding);
    }),
  };
});

// ── Mock Mongoose Models ───────────────────────────────────────────────────
jest.mock('../../backend/models/VotingToken');
jest.mock('../../backend/models/Vote');
jest.mock('../../backend/models/Voter');

const VotingToken = require('../../backend/models/VotingToken');
const Vote = require('../../backend/models/Vote');
const Voter = require('../../backend/models/Voter');

// ── Cryptographic & verification utilities under test ───────────────────────
const { decryptAES } = require('../../backend/crypto/aes');
const { verifyVoteReceipt } = require('../../backend/services/verificationService');
const { jwtSecret } = require('../../backend/config/keys');
const app = require('../../backend/app');

describe('Part 6 (Tanaya): Vote Submission API + SHA-256 Receipt Integration Tests', () => {
  const validAesKey = crypto.randomBytes(32).toString('hex');
  const voterId = 'voter_test_123';
  let validJwt;

  beforeAll(() => {
    process.env.AES_SECRET_KEY = validAesKey;
    validJwt = jwt.sign({ sub: voterId, role: 'voter' }, jwtSecret, { expiresIn: '1h' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AES_SECRET_KEY = validAesKey;
    Voter.findById.mockResolvedValue({ _id: voterId, hasVoted: false, save: jest.fn() });
    Vote.findOne.mockResolvedValue(null);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Happy Path: Vote Submission & Receipt Generation
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Successful vote submission', () => {
    it('accepts valid vote, persists encrypted ballot with authTag, returns receipt matching Member 7 verifier', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);
      const candidateId = 'c1';
      const votePayload = { candidateId, timestamp: new Date().toISOString() };

      // Setup mock voter
      Voter.findById.mockResolvedValue({ _id: voterId, hasVoted: false, save: jest.fn() });

      // Setup mock voting token (unused in DB)
      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      VotingToken.findOneAndUpdate.mockResolvedValue({ tokenHash, used: true, usedAt: new Date() });

      let savedVoteDocument = null;
      Vote.create.mockImplementation(async (doc) => {
        savedVoteDocument = { ...doc, _id: 'vote_mongo_id_999' };
        return savedVoteDocument;
      });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId, votePayload });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Vote cast successfully');
      expect(res.body.receiptHash).toMatch(/^[a-f0-9]{64}$/);
      expect(res.body.voteId).toBe('vote_mongo_id_999');

      // 2. Check persistence of encrypted fields
      expect(savedVoteDocument).not.toBeNull();
      expect(savedVoteDocument.encryptedVote).toBeDefined();
      expect(savedVoteDocument.iv).toMatch(/^[a-f0-9]{24}$/);       // 12 bytes = 24 hex
      expect(savedVoteDocument.authTag).toMatch(/^[a-f0-9]{32}$/);  // 16 bytes = 32 hex
      expect(savedVoteDocument.candidateId).toBe(candidateId);
      expect(savedVoteDocument.receiptHash).toBe(res.body.receiptHash);

      // Verify that decryptAES can decrypt the stored record back to the original payload
      const decrypted = decryptAES(
        {
          encryptedVote: savedVoteDocument.encryptedVote,
          iv: savedVoteDocument.iv,
          authTag: savedVoteDocument.authTag,
        },
        validAesKey
      );
      expect(JSON.parse(decrypted)).toEqual(votePayload);

      // 3. Receipt verification using Member 7's verifier
      Vote.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(savedVoteDocument),
      });

      const verificationResult = await verifyVoteReceipt(res.body.receiptHash);
      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.status).toBe('Vote included');
      expect(verificationResult.candidateId).toBe(candidateId);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Token Security & Signature Rejection
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Token & Signature Rejections', () => {
    it('rejects submission when token signature is forged or invalid (401)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const fakeSignature = Buffer.from('attacker-forged-signature').toString('base64');
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature: fakeSignature, candidateId: 'c2' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('signature is invalid');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('rejects submission when token was never issued by the system (401)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);

      // Token not found in DB
      VotingToken.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('not issued by our system');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('rejects submission when signature is missing (400)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, candidateId: 'c1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('signature is required');
    });

    it('rejects submission when candidateId or token is missing (400)', async () => {
      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ candidateId: 'c1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('required');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Replay Attack & Double-Voting Prevention
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Replay Attack & Race Condition Prevention', () => {
    it('rejects previously consumed token during stage 3 verification (409)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      // Token already marked used
      VotingToken.findOne.mockResolvedValue({ tokenHash, used: true, usedAt: new Date() });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c3' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already been used');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('prevents concurrent race conditions via atomic markTokenAsUsed (409)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      // Simulate race condition: findOne returned unused, but findOneAndUpdate returned null because another thread won
      VotingToken.findOneAndUpdate.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already marked as used');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('rejects second vote attempt by an authenticated voter account (403)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      Voter.findById.mockResolvedValue({ _id: voterId, hasVoted: true });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Voter cannot vote again');
      expect(Vote.create).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Failure Handling & Atomic Rollback
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Failure Recovery & Key Validation', () => {
    it('returns 500 when AES key is missing or invalid', async () => {
      process.env.AES_SECRET_KEY = 'short-invalid-key';

      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('AES key');
      expect(Vote.create).not.toHaveBeenCalled();
    });

    it('rolls back token consumption when database Vote.create fails', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      VotingToken.findOneAndUpdate.mockResolvedValue({ tokenHash, used: true, usedAt: new Date() });
      VotingToken.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Database error during vote creation
      Vote.create.mockRejectedValue(new Error('MongoDB connection timeout'));

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('Failed to record vote');

      // Verify rollback was executed
      expect(VotingToken.updateOne).toHaveBeenCalledWith(
        { tokenHash },
        { $set: { used: false }, $unset: { usedAt: 1 } }
      );
    });

    it('recovers idempotently without token rollback if Vote was persisted despite write acknowledgment error', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      VotingToken.findOneAndUpdate.mockResolvedValue({ tokenHash, used: true, usedAt: new Date() });

      // Simulate write error (e.g. client socket dropped during acknowledgment)
      Vote.create.mockRejectedValue(new Error('Socket timeout waiting for primary write acknowledgment'));

      // BUT query confirms the vote document was indeed committed in MongoDB!
      const existingVoteDoc = {
        _id: 'existing_persisted_vote_id',
        receiptHash: 'existing_persisted_receipt_hash',
      };
      Vote.findOne.mockResolvedValue(existingVoteDoc);

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      // Must succeed idempotently with 201 Created
      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Vote cast successfully');
      expect(res.body.voteId).toBe('existing_persisted_vote_id');

      // Must NOT unmark the token (guards against double-voting)
      expect(VotingToken.updateOne).not.toHaveBeenCalled();
    });

    it('does not rollback token when vote persistence status is uncertain (prevents double-voting)', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const signature = signToken(rawToken);
      const tokenHash = hashToken(rawToken);

      VotingToken.findOne.mockResolvedValue({ tokenHash, used: false });
      VotingToken.findOneAndUpdate.mockResolvedValue({ tokenHash, used: true, usedAt: new Date() });

      // Vote.create fails
      Vote.create.mockRejectedValue(new Error('Network error'));
      // AND Vote.findOne also fails (database unreachable, status is uncertain)
      Vote.findOne.mockRejectedValue(new Error('Database unreachable'));

      const res = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: rawToken, signature, candidateId: 'c1' });

      expect(res.status).toBe(500);
      expect(res.body.message).toContain('vote state is uncertain');

      // Must NOT blindly reset token to unused
      expect(VotingToken.updateOne).not.toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Complete End-to-End Flow: Member 3 -> Member 4 -> Member 6 -> Replay Check
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Complete Flow: Member 3 Issuance -> Member 4 Verification -> Member 6 Vote Cast -> Member 4 Replay Guard', () => {
    it('executes full pipeline and prevents replay attack after vote is cast', async () => {
      // Step 1: Member 3 Token Issuance
      Voter.findById.mockResolvedValue({
        _id: voterId,
        otpVerified: true,
        isEligible: true,
        hasReceivedToken: false,
        hasVoted: false,
        save: jest.fn(),
      });

      Voter.findOneAndUpdate.mockResolvedValue({
        _id: voterId,
        hasReceivedToken: false,
      });

      let issuedTokenHash = null;
      VotingToken.create.mockImplementation(async (doc) => {
        issuedTokenHash = doc.tokenHash;
        return { ...doc, _id: 'issued_token_doc_id' };
      });

      const genRes = await request(app)
        .post('/api/token/generate')
        .set('Authorization', `Bearer ${validJwt}`)
        .send();

      expect(genRes.status).toBe(201);
      expect(genRes.body.token).toBeDefined();
      expect(genRes.body.signature).toBeDefined();

      const { token: issuedToken, signature: issuedSignature } = genRes.body;

      // Step 2: Member 4 Pre-Vote Verification
      VotingToken.findOne.mockResolvedValue({
        tokenHash: issuedTokenHash,
        used: false,
        usedAt: null,
      });

      const verifyRes = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: issuedToken, signature: issuedSignature });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.valid).toBe(true);
      expect(verifyRes.body.code).toBe('VALID');

      // Step 3: Member 6 Vote Cast (with Member 5 AES encryption & SHA-256 receipt)
      VotingToken.findOneAndUpdate.mockResolvedValue({
        tokenHash: issuedTokenHash,
        used: true,
        usedAt: new Date(),
      });

      Vote.create.mockResolvedValue({
        _id: 'e2e_vote_id_123',
        candidateId: 'c2',
        receiptHash: 'mock_receipt_hash',
      });

      const voteRes = await request(app)
        .post('/api/vote/cast')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({
          token: issuedToken,
          signature: issuedSignature,
          candidateId: 'c2',
        });

      expect(voteRes.status).toBe(201);
      expect(voteRes.body.message).toBe('Vote cast successfully');
      expect(voteRes.body.receiptHash).toMatch(/^[a-f0-9]{64}$/);

      // Step 4: Member 4 Replay Attack Rejection
      VotingToken.findOne.mockResolvedValue({
        tokenHash: issuedTokenHash,
        used: true,
        usedAt: new Date(),
      });

      const replayVerifyRes = await request(app)
        .post('/api/token/verify')
        .set('Authorization', `Bearer ${validJwt}`)
        .send({ token: issuedToken, signature: issuedSignature });

      expect(replayVerifyRes.status).toBe(409);
      expect(replayVerifyRes.body.valid).toBe(false);
      expect(replayVerifyRes.body.code).toBe('TOKEN_ALREADY_USED');
    });
  });
});
