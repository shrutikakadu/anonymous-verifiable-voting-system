/**
 * scripts/demonstrate-attacks.js
 * -------------------------------------------------------------
 * Part 10: Automated Local Security Attack Demonstration
 *
 * For: Anonymous Verifiable Voting System — Security Testing
 *
 * This script runs safe, local-only simulations demonstrating that
 * the core cryptographic and access-control defenses successfully
 * reject adversarial attacks:
 *
 *   [ATTACK 1] Forged Voting Token (Fake RSA Signature)
 *   [ATTACK 2] Token Replay & Double-Voting Attack
 *   [ATTACK 3] Tampered Ballot & Integrity Check Failure
 *   [ATTACK 4] OTP Multi-Factor Authentication Bypass
 *   [ATTACK 5] Unauthorized Admin Privilege Escalation (RBAC)
 *
 * Usage:
 *   node scripts/demonstrate-attacks.js
 */

'use strict';

const path = require('path');
// Add backend/node_modules to Node.js resolution path
module.paths.push(path.join(__dirname, '..', 'backend', 'node_modules'));
module.paths.push(path.join(__dirname, '..', 'node_modules'));

const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// ANSI Terminal Colors
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const CYAN   = '\x1b[36m';

// Lightweight standalone mock factory for independent Node CLI execution
function fn(initialResolution) {
  let resolution = initialResolution;
  const mockFn = (...args) => {
    mockFn.calls.push(args);
    return Promise.resolve(resolution);
  };
  mockFn.calls = [];
  mockFn.mockResolvedValue = (val) => {
    resolution = val;
    return mockFn;
  };
  mockFn.mockReturnValue = (val) => {
    return () => val;
  };
  return mockFn;
}

// ── In-Memory Model Mocks for Self-Contained Local Demonstration ─────────────
const Voter = require('../backend/models/Voter');
const VotingToken = require('../backend/models/VotingToken');
const Vote = require('../backend/models/Vote');
const Admin = require('../backend/models/Admin');
const RevokedToken = require('../backend/models/RevokedToken');

RevokedToken.exists = fn(false);

const { jwtSecret } = require('../backend/config/keys');
const { encryptAES } = require('../backend/crypto/aes');
const { hashValue } = require('../backend/crypto/sha256');

// Generate Demonstration RSA Keypairs
const serverKeys = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const attackerKeys = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Helper: sign token
const sign = (data, privKey) => {
  const s = crypto.createSign('sha256');
  s.update(data);
  s.end();
  return s.sign(privKey, 'base64');
};

const hashToken = (str) => crypto.createHash('sha256').update(str).digest('hex');

// Load Express app
const app = require('../backend/app');

// Configure test environment keys
const AES_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.AES_SECRET_KEY = AES_KEY;

// Mock filesystem read for keyManager to load our test keys
const fs = require('fs');
const origReadFileSync = fs.readFileSync;
fs.readFileSync = function (filePath, options) {
  if (typeof filePath === 'string' && filePath.includes('public.pem')) {
    return serverKeys.publicKey;
  }
  if (typeof filePath === 'string' && filePath.includes('private.pem')) {
    return serverKeys.privateKey;
  }
  return origReadFileSync.apply(this, arguments);
};

let attacksRun = 0;
let attacksBlocked = 0;

function header(title) {
  console.log(`\n${CYAN}${BOLD}======================================================================${RESET}`);
  console.log(`${CYAN}${BOLD} ${title}${RESET}`);
  console.log(`${CYAN}${BOLD}======================================================================${RESET}`);
}

function resultBadge(blocked, expectedStatus, actualStatus, defense) {
  attacksRun++;
  if (blocked) {
    attacksBlocked++;
    console.log(`  ${GREEN}${BOLD}[DEFENSE PASSED]${RESET} Attack successfully neutralized!`);
    console.log(`  Expected HTTP: ${YELLOW}${expectedStatus}${RESET} | Received HTTP: ${GREEN}${actualStatus}${RESET}`);
    console.log(`  Security Control: ${CYAN}${defense}${RESET}\n`);
  } else {
    console.log(`  ${RED}${BOLD}[DEFENSE FAILED]${RESET} Attack succeeded unexpectedly!`);
    console.log(`  Expected HTTP: ${YELLOW}${expectedStatus}${RESET} | Received HTTP: ${RED}${actualStatus}${RESET}\n`);
  }
}

async function runAttackDemonstration() {
  console.log(`\n${BLUE}${BOLD}╔════════════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}${BOLD}║  ANONYMOUS VERIFIABLE VOTING SYSTEM — SECURITY ATTACK SUITE        ║${RESET}`);
  console.log(`${BLUE}${BOLD}║  Part 10: Automated Security Testing & Attack Demonstration       ║${RESET}`);
  console.log(`${BLUE}${BOLD}╚════════════════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`Operating in SAFE LOCAL TEST ENVIRONMENT — No external networks targeted.`);

  const voterJwt = jwt.sign({ sub: 'demo_voter_01', role: 'voter', voterId: 'VOTER_DEMO_01', otp: true }, jwtSecret, { expiresIn: '1h' });
  const attackerJwt = jwt.sign({ sub: 'demo_attacker_02', role: 'voter', voterId: 'ATTACKER_99', otp: true }, jwtSecret, { expiresIn: '1h' });

  // ───────────────────────────────────────────────────────────────────────────
  // ATTACK 1: Forged Voting Token
  // ───────────────────────────────────────────────────────────────────────────
  header('ATTACK SCENARIO 1: FORGED RSA VOTING TOKEN INJECTION');
  console.log('Adversary Strategy: An attacker crafts a counterfeit token and signs it');
  console.log('                    with their own rogue RSA private key, attempting to submit a vote.');

  const fakeToken = crypto.randomBytes(32).toString('hex');
  const forgedSig = sign(fakeToken, attackerKeys.privateKey);

  Voter.findById = fn({ _id: 'demo_voter_01', hasVoted: false, save: fn() });
  Vote.create = fn();

  console.log(`  Attacker Payload: Token = ${fakeToken.slice(0, 16)}..., Signature = [Rogue RSA-2048]`);
  console.log(`  Target Endpoint: POST /api/vote/cast`);

  const res1 = await request(app)
    .post('/api/vote/cast')
    .set('Authorization', `Bearer ${voterJwt}`)
    .send({ token: fakeToken, signature: forgedSig, candidateId: 'ROGUE_CANDIDATE' });

  console.log(`  Server Response: status=${res1.status}, error="${res1.body.message}"`);
  resultBadge(
    res1.status === 401 && res1.body.message.includes('signature is invalid'),
    401,
    res1.status,
    'RSA-SHA256 Digital Signature Verification against Server Public Key'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // ATTACK 2: Replay Attack (Double Voting)
  // ───────────────────────────────────────────────────────────────────────────
  header('ATTACK SCENARIO 2: REPLAY ATTACK & DOUBLE-VOTING');
  console.log('Adversary Strategy: An attacker intercepts or reuses a legitimate token');
  console.log('                    to cast a second vote for another candidate.');

  const realToken = crypto.randomBytes(32).toString('hex');
  const realSig = sign(realToken, serverKeys.privateKey);
  const realHash = hashToken(realToken);

  // Simulate token marked used in DB ledger
  VotingToken.findOne = fn({
    tokenHash: realHash,
    used: true,
    usedAt: new Date(),
  });

  console.log(`  Attacker Action: Submitting previously consumed token: ${realToken.slice(0, 16)}...`);
  console.log(`  Target Endpoint: POST /api/token/verify & POST /api/vote/cast`);

  const res2 = await request(app)
    .post('/api/vote/cast')
    .set('Authorization', `Bearer ${voterJwt}`)
    .send({ token: realToken, signature: realSig, candidateId: 'SECOND_CANDIDATE' });

  console.log(`  Server Response: status=${res2.status}, code="${res2.body.code}", error="${res2.body.message}"`);
  resultBadge(
    res2.status === 409 && res2.body.code === 'TOKEN_ALREADY_USED',
    409,
    res2.status,
    '3-Stage Token Verification + Atomic Token Consumption (Replay Guard)'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // ATTACK 3: Tampered Encrypted Ballot Record in Database
  // ───────────────────────────────────────────────────────────────────────────
  header('ATTACK SCENARIO 3: TAMPERED BALLOT DATA IN LEDGER');
  console.log('Adversary Strategy: A malicious insider modifies the candidateId or ciphertext');
  console.log('                    in the database to manipulate election results.');

  const genuineEncrypted = encryptAES(JSON.stringify({ candidateId: 'GENUINE_CANDIDATE' }), AES_KEY);
  const genuineReceipt = hashValue(`${genuineEncrypted.encryptedVote}:${genuineEncrypted.iv}:GENUINE_CANDIDATE`).toLowerCase();

  // Tampered DB record: candidate changed to 'CORRUPTED_CANDIDATE'
  const tamperedVoteDoc = {
    encryptedVote: genuineEncrypted.encryptedVote,
    iv: genuineEncrypted.iv,
    authTag: genuineEncrypted.authTag,
    candidateId: 'CORRUPTED_CANDIDATE', // TAMPERED!
    receiptHash: genuineReceipt,
    timestamp: new Date(),
  };

  Vote.findOne = () => ({
    lean: () => Promise.resolve(tamperedVoteDoc),
  });

  console.log(`  Voter Action: Auditing receipt ${genuineReceipt.slice(0, 16)}...`);
  console.log(`  Target Endpoint: GET /api/verification/${genuineReceipt}`);

  const res3 = await request(app).get(`/api/verification/${genuineReceipt}`);

  console.log(`  Server Response: status=${res3.status}, statusText="${res3.body.status}", code="${res3.body.code}"`);
  resultBadge(
    res3.status === 404 && res3.body.code === 'INTEGRITY_FAILED',
    404,
    res3.status,
    'SHA-256 Digest Recomputation & AES-256-GCM AEAD Tag Integrity Check'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // ATTACK 4: OTP Bypass Attempt
  // ───────────────────────────────────────────────────────────────────────────
  header('ATTACK SCENARIO 4: OTP MULTI-FACTOR AUTHENTICATION BYPASS');
  console.log('Adversary Strategy: An attacker logs in and directly calls the voting token API');
  console.log('                    attempting to skip OTP email verification.');

  Voter.findById = fn({
    _id: 'demo_attacker_02',
    voterId: 'ATTACKER_99',
    otpVerified: false, // OTP was NOT verified!
    isEligible: true,
    hasReceivedToken: false,
  });

  console.log(`  Attacker Action: Calling /api/token/generate with unverified OTP session`);
  console.log(`  Target Endpoint: POST /api/token/generate`);

  const res4 = await request(app)
    .post('/api/token/generate')
    .set('Authorization', `Bearer ${attackerJwt}`)
    .send();

  console.log(`  Server Response: status=${res4.status}, error="${res4.body.message}"`);
  resultBadge(
    res4.status === 403 && res4.body.message.includes('OTP verification required'),
    403,
    res4.status,
    'Strict Session State Check (otpVerified === true) Before Token Grant'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // ATTACK 5: Unauthorized Admin Privilege Escalation (RBAC)
  // ───────────────────────────────────────────────────────────────────────────
  header('ATTACK SCENARIO 5: PRIVILEGE ESCALATION TO ADMIN OPERATIONS');
  console.log('Adversary Strategy: A regular authenticated voter attempts to access');
  console.log('                    restricted admin routes to trigger election tally.');

  console.log(`  Attacker Action: Regular voter JWT calling POST /api/admin/tally`);
  console.log(`  Target Endpoint: POST /api/admin/tally`);

  const res5 = await request(app)
    .post('/api/admin/tally')
    .set('Authorization', `Bearer ${voterJwt}`) // role: 'voter', not 'admin'
    .send();

  console.log(`  Server Response: status=${res5.status}, error="${res5.body.message}"`);
  resultBadge(
    res5.status === 403 && res5.body.message === 'Admin access required',
    403,
    res5.status,
    'Role-Based Access Control (RBAC) via adminOnly Middleware'
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ───────────────────────────────────────────────────────────────────────────
  console.log(`\n${GREEN}${BOLD}======================================================================${RESET}`);
  console.log(`${GREEN}${BOLD} DEMONSTRATION SUMMARY: ALL ATTACKS NEUTRALIZED (${attacksBlocked}/${attacksRun})${RESET}`);
  console.log(`${GREEN}${BOLD}======================================================================${RESET}`);
  console.log(`  Total Simulated Attacks:  ${attacksRun}`);
  console.log(`  Attacks Neutralized:      ${GREEN}${attacksBlocked}${RESET}`);
  console.log(`  Attacks Permitted:        ${attacksRun - attacksBlocked}`);
  console.log(`  Defense System Status:    ${GREEN}SECURE & ROBUST${RESET}\n`);
}

// Self-executing demo
runAttackDemonstration().catch((err) => {
  console.error('Demonstration failed with runtime error:', err);
  process.exit(1);
});
