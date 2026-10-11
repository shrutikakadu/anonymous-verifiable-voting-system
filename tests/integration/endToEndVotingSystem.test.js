/**
 * tests/integration/endToEndVotingSystem.test.js
 * -----------------------------------------------
 * Part 10: System Integration Test — Complete End-to-End Voting Lifecycle
 *
 * Full Implemented Lifecycle:
 *  1. Voter Authentication:
 *     Registration -> Login -> OTP Generation & Verification
 *  2. Anonymous Token Management:
 *     RSA Token Issuance -> Signature Verification & Anonymity Barrier
 *  3. Vote Submission & Confidentiality:
 *     Token Consumption -> AES-256-GCM Ballot Encryption -> Database Storage
 *  4. Verifiability & Receipt Generation:
 *     SHA-256 Receipt Hash -> Public Bulletin Board -> Individual Verification
 *  5. Administrative Governance & Audit:
 *     Admin Authentication -> Authenticated Decryption & Secure Vote Tally
 *
 * Mock vs. Real Component Identification:
 *  - REAL: Node.js Crypto (RSA-2048 key pairs, AES-256-GCM encryption/decryption, SHA-256 hashes)
 *  - REAL: Bcrypt password hashing and verification
 *  - REAL: JSON Web Token (JWT) generation, signing, and verification
 *  - REAL: Express application routing, middleware execution (authenticateJWT, adminOnly), input validation
 *  - MOCKED: MongoDB / Mongoose models (Voter, VotingToken, Vote, Admin) to allow isolated, fast, deterministic CI execution without external database process dependencies
 *  - MOCKED: Nodemailer email transport (simulated OTP delivery)
 */

'use strict';

const crypto = require('crypto');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ── Mock Mongoose models ─────────────────────────────────────────────────────
jest.mock('../../backend/models/Voter');
jest.mock('../../backend/models/VotingToken');
jest.mock('../../backend/models/Vote');
jest.mock('../../backend/models/Admin');

const Voter = require('../../backend/models/Voter');
const VotingToken = require('../../backend/models/VotingToken');
const Vote = require('../../backend/models/Vote');
const Admin = require('../../backend/models/Admin');

// ── Real RSA Server Key Pair Generation for System Test ──────────────────────
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

// Mock OTP service email sender so no real SMTP connection is attempted
jest.mock('../../backend/services/otpService', () => {
  const actualOtpService = jest.requireActual('../../backend/services/otpService');
  return {
    ...actualOtpService,
    createOTPForVoter: jest.fn(async (voter) => {
      voter.otpCode = '719304';
      voter.otpVerified = false;
      return '719304';
    }),
  };
});

const app = require('../../backend/app');
const { jwtSecret } = require('../../backend/config/keys');
const { decryptAES } = require('../../backend/crypto/aes');

describe('System Testing: Complete End-to-End Anonymous Verifiable Voting Flow', () => {
  const validAesKey = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
  const rawPassword = 'StudentStrongPassword2026!';
  const voterId = 'VOTER202601';
  const email = 'student01@college.edu';
  const candidateSelected = 'CANDIDATE_ALICE';

  let voterMongoId;
  let voterJwt;
  let rawVotingToken;
  let tokenSignature;
  let tokenPublicKey;
  let tokenHash;
  let generatedReceiptHash;
  let persistedVoteRecord;

  beforeAll(() => {
    process.env.AES_SECRET_KEY = validAesKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 1: Voter Registration
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 1 [Auth]: Voter registers with valid credentials and receives registration confirmation', async () => {
    voterMongoId = 'voter_doc_mongo_id_777';

    Voter.findOne.mockResolvedValue(null); // No duplicate voter

    let storedPasswordHash = null;
    Voter.create.mockImplementation(async (doc) => {
      storedPasswordHash = doc.passwordHash;
      return {
        _id: voterMongoId,
        name: doc.name,
        voterId: doc.voterId,
        email: doc.email,
        passwordHash: doc.passwordHash,
        otpCode: '719304',
        otpVerified: false,
        isEligible: true,
        hasVoted: false,
        hasReceivedToken: false,
      };
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Student',
        voterId,
        email,
        password: rawPassword,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Registration successful');
    expect(res.body.voter.voterId).toBe(voterId);

    // Verify bcrypt hash was computed and stored (never plaintext)
    expect(storedPasswordHash).toBeDefined();
    expect(storedPasswordHash).not.toBe(rawPassword);
    const passwordMatches = await bcrypt.compare(rawPassword, storedPasswordHash);
    expect(passwordMatches).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 2: Voter Login
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 2 [Auth]: Voter authenticates with voterId and password and obtains a JWT session', async () => {
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const mockVoterDoc = {
      _id: voterMongoId,
      voterId,
      email,
      passwordHash,
      otpCode: '719304',
      otpVerified: false,
      isEligible: true,
      hasVoted: false,
      hasReceivedToken: false,
    };

    Voter.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockVoterDoc),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        voterId,
        password: rawPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toContain('Login successful. OTP verification required.');

    voterJwt = res.body.token;

    // Verify JWT payload
    const decoded = jwt.verify(voterJwt, jwtSecret);
    expect(decoded.sub).toBe(voterMongoId);
    expect(decoded.role).toBe('voter');
    expect(decoded.voterId).toBe(voterId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 3: OTP Verification
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 3 [MFA]: Voter submits OTP to complete authentication before voting session activation', async () => {
    const mockVoterDoc = {
      _id: voterMongoId,
      voterId,
      otpCode: '719304',
      otpVerified: false,
      save: jest.fn().mockResolvedValue(true),
    };

    Voter.findOne.mockResolvedValue(mockVoterDoc);

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        voterId,
        otpCode: '719304',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('verified');
    expect(mockVoterDoc.otpVerified).toBe(true);
    expect(mockVoterDoc.otpCode).toBeNull(); // Cleared to prevent replay
    expect(mockVoterDoc.save).toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 4: Anonymous RSA Voting Token Issuance
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 4 [Token]: Authenticated voter requests anonymous RSA-signed voting token', async () => {
    const mockVoterDoc = {
      _id: voterMongoId,
      voterId,
      otpVerified: true,
      isEligible: true,
      hasReceivedToken: false,
    };

    Voter.findById.mockResolvedValue(mockVoterDoc);
    Voter.findOneAndUpdate.mockResolvedValue({
      _id: voterMongoId,
      hasReceivedToken: true,
    });

    let savedTokenHash = null;
    VotingToken.create.mockImplementation(async (doc) => {
      savedTokenHash = doc.tokenHash;
      return { ...doc, _id: 'token_db_id_101' };
    });

    const res = await request(app)
      .post('/api/token/generate')
      .set('Authorization', `Bearer ${voterJwt}`)
      .send();

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.signature).toBeDefined();
    expect(res.body.publicKey).toBeDefined();
    expect(res.body.tokenHash).toBeDefined();

    rawVotingToken = res.body.token;
    tokenSignature = res.body.signature;
    tokenPublicKey = res.body.publicKey;
    tokenHash = res.body.tokenHash;

    // Cryptographic token hash verification
    const expectedHash = crypto.createHash('sha256').update(rawVotingToken).digest('hex');
    expect(tokenHash).toBe(expectedHash);
    expect(savedTokenHash).toBe(expectedHash);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 5: Pre-Vote Token Verification
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 5 [Token Verification]: Client verifies token signature and unused status before casting vote', async () => {
    VotingToken.findOne.mockResolvedValue({
      tokenHash,
      used: false,
      usedAt: null,
    });

    const res = await request(app)
      .post('/api/token/verify')
      .set('Authorization', `Bearer ${voterJwt}`)
      .send({
        token: rawVotingToken,
        signature: tokenSignature,
        publicKey: tokenPublicKey,
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.code).toBe('VALID');
    expect(res.body.message).toContain('valid and has not been used');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 6: Vote Submission, AES-256-GCM Encryption & Receipt Generation
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 6 [Vote Submission]: Voter casts encrypted ballot, consumes token, and receives SHA-256 receipt', async () => {
    // Voter account state
    const mockVoterDoc = {
      _id: voterMongoId,
      hasVoted: false,
      save: jest.fn().mockResolvedValue(true),
    };
    Voter.findById.mockResolvedValue(mockVoterDoc);

    // Token record state
    VotingToken.findOne.mockResolvedValue({
      tokenHash,
      used: false,
    });
    VotingToken.findOneAndUpdate.mockResolvedValue({
      tokenHash,
      used: true,
      usedAt: new Date(),
    });

    Vote.create.mockImplementation(async (doc) => {
      persistedVoteRecord = {
        _id: 'vote_mongo_id_888',
        ...doc,
        timestamp: new Date(),
      };
      return persistedVoteRecord;
    });

    const res = await request(app)
      .post('/api/vote/cast')
      .set('Authorization', `Bearer ${voterJwt}`)
      .send({
        token: rawVotingToken,
        signature: tokenSignature,
        candidateId: candidateSelected,
        votePayload: { candidateId: candidateSelected, timestamp: new Date().toISOString() },
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Vote cast successfully');
    expect(res.body.receiptHash).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.voteId).toBe('vote_mongo_id_888');

    generatedReceiptHash = res.body.receiptHash;

    // Verify stored ballot integrity
    expect(persistedVoteRecord).toBeDefined();
    expect(persistedVoteRecord.encryptedVote).toBeDefined();
    expect(persistedVoteRecord.iv).toMatch(/^[a-f0-9]{24}$/);
    expect(persistedVoteRecord.authTag).toMatch(/^[a-f0-9]{32}$/);
    expect(persistedVoteRecord.receiptHash).toBe(generatedReceiptHash);

    // Verify authenticated decryption matches original selection
    const decryptedJson = decryptAES(
      {
        encryptedVote: persistedVoteRecord.encryptedVote,
        iv: persistedVoteRecord.iv,
        authTag: persistedVoteRecord.authTag,
      },
      validAesKey
    );
    const parsedPayload = JSON.parse(decryptedJson);
    expect(parsedPayload.candidateId).toBe(candidateSelected);

    // Verify voter account marked as voted
    expect(mockVoterDoc.hasVoted).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 7: Public Bulletin Board Verification
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 7 [Bulletin Board]: Public bulletin board displays anonymous vote record with zero voter identity exposure', async () => {
    Vote.countDocuments.mockResolvedValue(1);
    Vote.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              {
                receiptHash: generatedReceiptHash,
                candidateId: candidateSelected,
                timestamp: persistedVoteRecord.timestamp,
              },
            ]),
          }),
        }),
      }),
    });

    const res = await request(app).get('/api/verification/bulletin-board');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.totalVotes).toBe(1);
    expect(res.body.votes).toHaveLength(1);
    expect(res.body.votes[0].receiptHash).toBe(generatedReceiptHash);

    // Anonymity guarantee check: No voter identity fields in bulletin board entry
    const entry = res.body.votes[0];
    expect(entry.voterId).toBeUndefined();
    expect(entry.name).toBeUndefined();
    expect(entry.email).toBeUndefined();
    expect(entry.password).toBeUndefined();
    expect(entry.passwordHash).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 8: Public Individual Receipt Verification
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 8 [Receipt Verification]: Voter verifies ballot presence via receipt hash (GET and POST endpoints)', async () => {
    Vote.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(persistedVoteRecord),
    });

    // 1. GET /api/verification/:receiptHash
    const getRes = await request(app).get(`/api/verification/${generatedReceiptHash}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.valid).toBe(true);
    expect(getRes.body.status).toBe('Vote included');
    expect(getRes.body.code).toBe('VOTE_INCLUDED');
    expect(getRes.body.receiptHash).toBe(generatedReceiptHash);
    expect(getRes.body.candidateId).toBe(candidateSelected);

    // 2. POST /api/verification/verify
    const postRes = await request(app)
      .post('/api/verification/verify')
      .send({ receiptHash: generatedReceiptHash });

    expect(postRes.status).toBe(200);
    expect(postRes.body.valid).toBe(true);
    expect(postRes.body.status).toBe('Vote included');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE 9: Election Close & Secure Admin Tally
  // ───────────────────────────────────────────────────────────────────────────
  test('Step 9 [Tally]: Admin authenticates and runs secure tally decrypting ballots to yield election results', async () => {
    const adminPassword = 'AdminSecureMaster2026!';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const adminId = 'admin_system_001';

    Admin.findOne.mockResolvedValue({
      _id: adminId,
      username: 'admin_election_lead',
      passwordHash: adminHash,
      role: 'admin',
    });

    // Admin login
    const loginRes = await request(app)
      .post('/api/admin/login')
      .send({
        username: 'admin_election_lead',
        password: adminPassword,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    const adminJwt = loginRes.body.token;

    // Admin triggers secure tally
    Vote.find.mockResolvedValue([persistedVoteRecord]);

    const tallyRes = await request(app)
      .post('/api/admin/tally')
      .set('Authorization', `Bearer ${adminJwt}`)
      .send();

    expect(tallyRes.status).toBe(200);
    expect(tallyRes.body.message).toBe('Secure tally complete');
    expect(tallyRes.body.totalVotes).toBe(1);
    expect(tallyRes.body.talliedVotes).toBe(1);
    expect(tallyRes.body.rejectedVotes).toBe(0);
    expect(tallyRes.body.candidateResults[candidateSelected]).toBe(1);
  });
});
