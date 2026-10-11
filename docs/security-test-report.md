# Security Testing, Attack Demonstration, and System Testing Report

**Project Name:** Anonymous Verifiable Voting System  
**Module Assignment:** Part 10: Security Testing, Attack Demonstration, and System Testing  
**Course:** Cryptography and Network Security (CNS) / College Project  
**Date:** October 2026  
**Status:** Complete — All 16 Test Suites (172 Tests) Passing (100% Pass Rate)

---

## 1. Title and Project Information

### 1.1 Project Overview
The **Anonymous Verifiable Voting System** is a cryptographically secured web voting platform designed to resolve the fundamental conflict between **voter privacy** (anonymity) and **election integrity** (public auditability and double-voting prevention). 

The platform separates the voter registration domain from the ballot storage domain:
- Voter identity is authenticated via credentials, Multi-Factor Authentication (OTP), and JSON Web Tokens (JWT).
- The voter is issued a single, anonymous RSA-2048 digitally signed voting token.
- Only the SHA-256 hash of this token is stored in the token ledger (maintaining zero link to voter identity).
- Votes are cast using the anonymous token, encrypted via AES-256-GCM with a fresh Initialization Vector (IV) and a 16-byte authentication tag, and recorded alongside a SHA-256 receipt hash.
- Individual voters verify that their ballot is included on the public bulletin board using their receipt hash, while an administrator performs a secure authenticated tally after election closing.

### 1.2 Purpose of Part 10 Module
The primary responsibility of **Part 10** is the comprehensive security validation, vulnerability inspection, adversarial attack demonstration, and full-lifecycle system integration testing of the complete application. Specifically, Part 10:
1. Validates that security mechanisms (cryptographic signatures, authenticated encryption, hashing, atomic state transitions, and access-control middleware) reliably withstand adversarial manipulation.
2. Implements automated, regression-free security test suites replacing initial placeholder stubs.
3. Provides an end-to-end integration test validating the entire 9-step voting journey.
4. Provides a safe, automated, local-only attack demonstration script for evaluation and demonstration.

---

## 2. Objective and Scope

### 2.1 Testing Objectives
- **Authentication & MFA Enforcement:** Confirm that voting sessions and token issuance are strictly guarded by credentials and verified email OTPs.
- **Cryptographic Unforgeability:** Verify that tokens generated with rogue keys, corrupted signatures, or altered byte streams are rejected.
- **Double-Voting & Replay Resistance:** Empirically demonstrate that tokens can only be consumed once, even under concurrent submission race conditions.
- **Ballot Confidentiality & Authenticity:** Verify that AES-256-GCM AEAD encryption maintains secrecy and that any tampering with ciphertext, IV, or authentication tag throws cryptographic exceptions.
- **Receipt & Ledger Verification:** Confirm that SHA-256 receipt hashes detect tampering in database records and that the public bulletin board never leaks voter identity.
- **Role-Based Access Control (RBAC):** Confirm that administrative functions (dashboard and tallying) strictly reject unauthenticated users and regular voters.
- **System Integration:** Validate the complete interconnected pipeline across all team members' modules.

### 2.2 Scope of Tested Components

| Component / Layer | Source Files Tested | Security Controls Tested |
| :--- | :--- | :--- |
| **Authentication & Profile** | `backend/controllers/authController.js`<br>`backend/controllers/voterController.js`<br>`backend/services/otpService.js` | Bcrypt hashing ($10$ rounds), JWT session issuance, OTP generation & verification, duplicate registration prevention |
| **Token Generation & Verification** | `backend/controllers/tokenController.js`<br>`backend/services/tokenService.js`<br>`backend/services/tokenVerificationService.js` | RSA-2048 digital signing, SHA-256 token hashing, 3-stage verification, atomic token consumption (`findOneAndUpdate`) |
| **Vote Casting & Encryption** | `backend/controllers/voteController.js`<br>`backend/services/voteService.js`<br>`backend/crypto/aes.js` | Input validation, AES-256-GCM authenticated encryption (IV + AuthTag), voter `hasVoted` guard, atomic rollback recovery |
| **Verification & Bulletin Board** | `backend/controllers/verificationController.js`<br>`backend/services/verificationService.js`<br>`backend/crypto/sha256.js` | SHA-256 receipt formula, database integrity check, ledger pagination, voter anonymity preservation |
| **Administration & Tallying** | `backend/controllers/adminController.js`<br>`backend/services/tallyService.js`<br>`backend/middleware/adminOnly.js` | Admin credentials check, RBAC protection, AES-256-GCM authenticated decryption, corrupted ballot quarantine |
| **Core Middleware** | `backend/middleware/authenticateJWT.js`<br>`backend/middleware/adminOnly.js`<br>`backend/middleware/errorHandler.js` | Bearer token extraction, JWT signature & expiration verification, role checks, HTTP error formatting |

*Out of Scope:* Physical hardware attacks, network-level distributed denial of service (DDoS), client browser cross-site scripting (XSS) from browser extensions.

### 2.3 Testing Environment and Tooling
- **Operating System:** Windows 10/11 (PowerShell environment)
- **Runtime Environment:** Node.js v24.21.0
- **Testing Framework:** Jest v30.5.2 configured with `--runInBand` (deterministic serial execution)
- **HTTP / Endpoint Integration Testing:** Supertest v7.1.3
- **Cryptographic Engine:** Node.js built-in `crypto` module (FIPS-compliant algorithms: RSA-2048, AES-256-GCM, SHA-256)
- **Token & Password Utilities:** `jsonwebtoken` v9.0.3, `bcryptjs` v3.0.3
- **Database Layer in Tests:** Mongoose/MongoDB data models isolated through deterministic in-memory test mocks and spies, guaranteeing reproducible, zero-external-dependency execution.

---

## 3. Security Test Cases

The table below catalogs all **60 automated security test cases** implemented across the 7 security test suites. Every test case has been executed, observed, and confirmed passing.

| Test ID | Security Test Case | Threat Being Checked | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-SEC-01** | Rejection of token signed with attacker RSA private key | Token Forgery / Fake Authority | `verifyVotingToken` returns `code: SIGNATURE_INVALID` | Rejected with `SIGNATURE_INVALID` | **PASS** |
| **TC-SEC-02** | Rejection of token with arbitrary 256-byte random signature blob | Malformed Signature Injection | `verifyVotingToken` returns `code: SIGNATURE_INVALID` | Rejected with `SIGNATURE_INVALID` | **PASS** |
| **TC-SEC-03** | Rejection of legitimate token with tampered string content | Token Bit-Flipping / Content Tampering | `verifyVotingToken` returns `code: SIGNATURE_INVALID` | Rejected with `SIGNATURE_INVALID` | **PASS** |
| **TC-SEC-04** | Rejection of genuine signature on unissued token not in DB | Unregistered Token Injection | `verifyVotingToken` returns `code: TOKEN_NOT_FOUND` | Rejected with `TOKEN_NOT_FOUND` | **PASS** |
| **TC-SEC-05** | API endpoint `/api/token/verify` rejects forged signature | Unauthorized Verification Attempt | HTTP 401 with `code: SIGNATURE_INVALID` | HTTP 401 returned | **PASS** |
| **TC-SEC-06** | API endpoint `/api/token/verify` rejects missing required fields | Parameter Tampering / Incomplete Input | HTTP 400 with `code: MISSING_FIELDS` | HTTP 400 returned | **PASS** |
| **TC-SEC-07** | API endpoint `/api/token/verify` rejects unrecorded token | Ghost Token Injection | HTTP 401 with `code: TOKEN_NOT_FOUND` | HTTP 401 returned | **PASS** |
| **TC-SEC-08** | API endpoint `/api/vote/cast` rejects ballot with forged token | Unauthorized Ballot Casting | HTTP 401 Unauthorized; vote not saved | HTTP 401 returned; 0 saved | **PASS** |
| **TC-SEC-09** | API endpoint `/api/vote/cast` rejects unissued token | Ballot Injection without Authority | HTTP 401 Unauthorized; vote not saved | HTTP 401 returned; 0 saved | **PASS** |
| **TC-SEC-10** | Rejection of previously consumed token in `/api/token/verify` | Token Replay / Double Verification | HTTP 409 with `code: TOKEN_ALREADY_USED` | HTTP 409 returned | **PASS** |
| **TC-SEC-11** | Direct consumption endpoint `/api/token/mark-used` rejects already used token | Replay Consumption | HTTP 409 Conflict with double-vote warning | HTTP 409 returned | **PASS** |
| **TC-SEC-12** | `/api/token/mark-used` validates presence of `tokenHash` | Input Validation Bypass | HTTP 400 Bad Request | HTTP 400 returned | **PASS** |
| **TC-SEC-13** | `/api/vote/cast` rejects ballot submission with consumed token | Double Voting / Ballot Duplication | HTTP 409 with `code: TOKEN_ALREADY_USED` | HTTP 409 returned | **PASS** |
| **TC-SEC-14** | Atomic guard prevents concurrent double-submit race condition | Concurrency / Race Condition Exploit | Exactly 1 request succeeds; 2nd receives HTTP 409 | 1 succeeded, 1 rejected (409) | **PASS** |
| **TC-SEC-15** | Voter cannot request a second voting token via `/api/token/generate` | Token Hoarding / Multiple Tokens | HTTP 409 Conflict; token generation blocked | HTTP 409 returned | **PASS** |
| **TC-SEC-16** | Account-level check prevents voting if `voter.hasVoted === true` | Account-level Double-Voting | HTTP 403 Forbidden ("Voter cannot vote again") | HTTP 403 returned | **PASS** |
| **TC-SEC-17** | Decryption fails when AES-256-GCM ciphertext is modified | Ciphertext Bit-Flipping Attack | `decryptAES` throws authentication failure | Threw auth tag error | **PASS** |
| **TC-SEC-18** | Decryption fails when GCM authentication tag is modified | Authentication Tag Tampering | `decryptAES` throws authentication failure | Threw auth tag error | **PASS** |
| **TC-SEC-19** | Decryption fails when Initialization Vector (IV) is modified | IV Manipulation Attack | `decryptAES` throws authentication failure | Threw auth tag error | **PASS** |
| **TC-SEC-20** | Decryption fails when attempting decryption with wrong AES key | Key Substitution Attack | `decryptAES` throws authentication failure | Threw auth tag error | **PASS** |
| **TC-SEC-21** | Receipt verification flags modified `candidateId` in database | Database Record Tampering (Insider Attack) | `verifyVoteReceipt` returns `INTEGRITY_FAILED` | Reported `INTEGRITY_FAILED` | **PASS** |
| **TC-SEC-22** | Receipt verification flags swapped ciphertext in database | Database Ballot Substitution | `verifyVoteReceipt` returns `INTEGRITY_FAILED` | Reported `INTEGRITY_FAILED` | **PASS** |
| **TC-SEC-23** | Verification API `/api/verification/:hash` returns HTTP 404 for tampered record | Public Ledger Verification Integrity | HTTP 404 with status "Tampered vote record" | HTTP 404 returned | **PASS** |
| **TC-SEC-24** | Admin tally isolates tampered ballots under `rejectedVotes` | Election Result Manipulation | Tampered ballot excluded from tally; counts quarantined | 1 rejected, valid tallied | **PASS** |
| **TC-SEC-25** | Token generation `/api/token/generate` blocked if `otpVerified === false` | MFA / OTP Bypass Attack | HTTP 403 Forbidden ("OTP verification required") | HTTP 403 returned | **PASS** |
| **TC-SEC-26** | Token generation succeeds once voter has verified OTP | Legitimate Post-MFA Voting Workflow | HTTP 201 Created with valid token & signature | HTTP 201 returned | **PASS** |
| **TC-SEC-27** | `/api/auth/verify-otp` rejects incorrect OTP code | OTP Guessing / Brute Force | HTTP 401 Unauthorized ("Invalid OTP") | HTTP 401 returned | **PASS** |
| **TC-SEC-28** | `/api/auth/verify-otp` validates presence of voterId and otpCode | Input Validation Bypass | HTTP 400 Bad Request ("required") | HTTP 400 returned | **PASS** |
| **TC-SEC-29** | `/api/auth/verify-otp` rejects non-existent voterId | Identity Spoofing | HTTP 404 Not Found ("Voter not found") | HTTP 404 returned | **PASS** |
| **TC-SEC-30** | OTP cannot be re-used after successful verification | OTP Replay Attack | HTTP 401 Unauthorized on replay (`otpCode === null`) | HTTP 401 returned | **PASS** |
| **TC-SEC-31** | Unauthenticated `GET /api/admin/dashboard` is rejected | Unauthorized Admin Access | HTTP 401 Unauthorized ("Missing or invalid JWT") | HTTP 401 returned | **PASS** |
| **TC-SEC-32** | Unauthenticated `POST /api/admin/tally` is rejected | Premature / Unauthorized Tally Execution | HTTP 401 Unauthorized ("Missing or invalid JWT") | HTTP 401 returned | **PASS** |
| **TC-SEC-33** | Malformed Authorization header (non-Bearer) is rejected | Header Injection / Malformed Auth | HTTP 401 Unauthorized | HTTP 401 returned | **PASS** |
| **TC-SEC-34** | Unauthenticated calls to all protected endpoints rejected | Systematic Route Protection | All return HTTP 401 Unauthorized | All 6 endpoints returned 401 | **PASS** |
| **TC-SEC-35** | Regular voter JWT cannot access `GET /api/admin/dashboard` | Privilege Escalation (RBAC Bypass) | HTTP 403 Forbidden ("Admin access required") | HTTP 403 returned | **PASS** |
| **TC-SEC-36** | Regular voter JWT cannot access `POST /api/admin/tally` | Privilege Escalation to Tally Engine | HTTP 403 Forbidden ("Admin access required") | HTTP 403 returned | **PASS** |
| **TC-SEC-37** | Forged JWT with `role: 'admin'` signed by rogue key is rejected | Cryptographic Token Forgery | HTTP 401 Unauthorized ("Invalid or expired JWT") | HTTP 401 returned | **PASS** |
| **TC-SEC-38** | Expired admin JWT is rejected | Session Expiration Bypass | HTTP 401 Unauthorized ("Invalid or expired JWT") | HTTP 401 returned | **PASS** |
| **TC-SEC-39** | Admin login rejects incorrect password | Credential Guessing | HTTP 401 Unauthorized ("Invalid admin credentials") | HTTP 401 returned | **PASS** |
| **TC-SEC-40** | Admin login rejects non-existent username | Username Enumeration / Spoofing | HTTP 401 Unauthorized ("Invalid admin credentials") | HTTP 401 returned | **PASS** |
| **TC-SEC-41** | Admin login rejects missing username or password | Input Validation Bypass | HTTP 400 Bad Request | HTTP 400 returned | **PASS** |
| **TC-SEC-42** | Authentic admin login succeeds and returns valid JWT | Legitimate Admin Access | HTTP 200 with JWT containing `role: 'admin'` | HTTP 200 with valid JWT | **PASS** |
| **TC-SEC-43** | Authentic admin accesses dashboard successfully | Authorized Dashboard Review | HTTP 200 with election overview | HTTP 200 returned | **PASS** |
| **TC-SEC-44** | Authentic admin executes secure vote tally successfully | Authorized Election Tally | HTTP 200 with accurate candidate counts | HTTP 200 returned | **PASS** |
| **TC-SEC-45** | Part 4: Second use of same token rejected by service | Double-Vote (Replay Attack) | Replay detected; `code: TOKEN_ALREADY_USED` | `TOKEN_ALREADY_USED` returned | **PASS** |
| **TC-SEC-46** | Part 4: Concurrent double-submit is race-condition safe | Concurrent Double-Submit Race | 1st returns true; 2nd returns false | Race caught; 2nd returned false | **PASS** |
| **TC-SEC-47** | Part 4: Attacker signs with own private key | Rogue Key Forgery | Rejected with `code: SIGNATURE_INVALID` | `SIGNATURE_INVALID` returned | **PASS** |
| **TC-SEC-48** | Part 4: Attacker passes own public key to match signature | Key Substitution Attack | Fails server key verification (`SIGNATURE_INVALID`) | `SIGNATURE_INVALID` returned | **PASS** |
| **TC-SEC-49** | Part 4: Random 256-byte blob signature rejected | Garbage Signature Injection | Rejected with `code: SIGNATURE_INVALID` | `SIGNATURE_INVALID` returned | **PASS** |
| **TC-SEC-50** | Part 4: Attacker flips single character in token string | Token Content Alteration | Rejected with `code: SIGNATURE_INVALID` | `SIGNATURE_INVALID` returned | **PASS** |
| **TC-SEC-51** | Part 4: Attacker appends extra characters to token | Token Extension Attack | Rejected with `code: SIGNATURE_INVALID` | `SIGNATURE_INVALID` returned | **PASS** |
| **TC-SEC-52** | Part 4: Valid signature on token not registered in DB | Unregistered Signature Injection | Rejected with `code: TOKEN_NOT_FOUND` | `TOKEN_NOT_FOUND` returned | **PASS** |
| **TC-SEC-53** | Part 4: Contract exports all VERIFY_RESULT constants | API Contract Integrity | All 6 constant codes properly exported | All 6 verified | **PASS** |
| **TC-SEC-54** | Part 7: Rejects unregistered 64-char SHA-256 receipt | Forged Receipt Query | Returns `valid: false`, `RECEIPT_NOT_FOUND` | `RECEIPT_NOT_FOUND` returned | **PASS** |
| **TC-SEC-55** | Part 7: Controller returns HTTP 404 for non-existent receipt | API Receipt Query Integrity | HTTP 404 with `RECEIPT_NOT_FOUND` | HTTP 404 returned | **PASS** |
| **TC-SEC-56** | Part 7: Rejects malformed receipt hashes (short, non-hex) | Format / Injection Attack | Returns `valid: false`, `INVALID_FORMAT` | `INVALID_FORMAT` returned | **PASS** |
| **TC-SEC-57** | Part 7: Controller returns HTTP 400 for malformed receipt hash | Malformed Receipt Request | HTTP 400 with `INVALID_FORMAT` | HTTP 400 returned | **PASS** |
| **TC-SEC-58** | Part 7: Detects altered database payload upon verification | Ledger Tampering Detection | Returns `valid: false`, `INTEGRITY_FAILED` | `INTEGRITY_FAILED` returned | **PASS** |
| **TC-SEC-59** | Part 7: Confirms vote inclusion for authentic receipt hash | Authentic Public Verifiability | Returns `valid: true`, status "Vote included" | Valid inclusion confirmed | **PASS** |
| **TC-SEC-60** | Part 7: Bulletin board never leaks voter identity fields | Anonymity Guarantee Audit | `voterId`, `email`, `name`, `password` undefined | All private fields undefined | **PASS** |

---

## 4. System Integration Testing

### 4.1 Implemented End-to-End Voting Flow
The system integration test suite ([`tests/integration/endToEndVotingSystem.test.js`](file:///c:/Users/User/Downloads/anonymous-verifiable-voting-system-main/anonymous-verifiable-voting-system/tests/integration/endToEndVotingSystem.test.js)) executes and validates the complete 9-stage election lifecycle:

```mermaid
sequenceDiagram
    autonumber
    actor Voter
    participant Auth as Auth & OTP Controller
    participant Token as Token Service (RSA)
    participant Vote as Vote Controller (AES-GCM)
    participant Ledger as Public Bulletin Board
    actor Admin

    Voter->>Auth: 1. Register (POST /api/auth/register)
    Auth-->>Voter: Registration OK + OTP Generated
    Voter->>Auth: 2. Login (POST /api/auth/login)
    Auth-->>Voter: JWT Session (role: voter)
    Voter->>Auth: 3. Verify OTP (POST /api/auth/verify-otp)
    Auth-->>Voter: Status: verified (MFA Active)
    Voter->>Token: 4. Request Token (POST /api/token/generate)
    Token-->>Voter: Anonymous Token + RSA Signature + Public Key
    Voter->>Token: 5. Verify Token (POST /api/token/verify)
    Token-->>Voter: Status: VALID (Signature OK, Unused)
    Voter->>Vote: 6. Cast Ballot (POST /api/vote/cast)
    Note over Vote: Encrypt ballot with AES-256-GCM<br/>Atomically mark token used<br/>Generate SHA-256 receipt
    Vote-->>Voter: 201 Created + SHA-256 Receipt Hash
    Voter->>Ledger: 7. Audit Board (GET /api/verification/bulletin-board)
    Ledger-->>Voter: Public Receipts (Voter ID strictly omitted)
    Voter->>Ledger: 8. Verify Receipt (GET /api/verification/:hash)
    Ledger-->>Voter: Status: "Vote included" (Integrity Confirmed)
    Admin->>Auth: 9. Admin Login & Tally (POST /api/admin/tally)
    Note over Auth: Decrypt ballots with AES-256-GCM<br/>Validate AuthTag & tally candidate counts
    Auth-->>Admin: Election Results (Tallied: 1, Rejected: 0)
```

### 4.2 Real vs. Mocked Components

| Pipeline Step | Real Components Executed | Mocked / Fixture Components | Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Step 1: Registration** | `bcryptjs` hashing ($10$ salt rounds), email/voterId regex validation, Express request parsing | `Voter` Mongoose model mock, Nodemailer transport | Eliminates external SMTP connection failures while validating true password hashing. |
| **Step 2: Login** | `bcrypt.compare` password verification, `jsonwebtoken` signing with `jwtSecret` | `Voter.findOne` document query mock | Validates true cryptographic token generation and credential evaluation. |
| **Step 3: OTP Verification** | OTP match logic, `otpVerified` state update, `otpCode` nullification | `Voter.save` persistence mock | Validates true MFA session activation and single-use replay prevention. |
| **Step 4: Token Issuance** | `crypto.randomBytes(32)` generation, RSA-2048 signing (`crypto.createSign('sha256')`), SHA-256 token hashing | `Voter.findOneAndUpdate` atomic mock, `VotingToken.create` mock | Validates true RSA digital signatures while maintaining zero-DB dependency. |
| **Step 5: Pre-Vote Verification** | `crypto.createVerify('sha256')` RSA verification, SHA-256 digest recalculation | `VotingToken.findOne` mock | Tests authentic cryptographic signature validation. |
| **Step 6: Vote Submission** | AES-256-GCM authenticated encryption, 12-byte random IV generation, 16-byte authTag extraction, SHA-256 receipt generation | `Vote.create` persistence mock, `markTokenAsUsed` mock | Verifies authentic AEAD encryption and receipt math. |
| **Step 7: Bulletin Board** | Bulletin board query filtering, pagination arithmetic, anonymity projection | `Vote.find` query fixture | Confirms that private voter identifiers are never exposed publicly. |
| **Step 8: Receipt Verification** | SHA-256 recalculation: $\text{hashValue}(\text{cipher} : \text{iv} : \text{cand})$, string comparison | `Vote.findOne` query mock | Validates true end-to-end receipt formula matching. |
| **Step 9: Admin Tally** | AES-256-GCM authenticated decryption, authTag verification, JSON parsing, count aggregation | `Admin.findOne` mock, `Vote.find` mock | Confirms that genuine ballots decrypt cleanly and tampered ballots are excluded. |

### 4.3 Integration Test Execution Results
Both integration test suites execute cleanly and pass without errors:
- [`tests/integration/votingFlow.test.js`](file:///c:/Users/User/Downloads/anonymous-verifiable-voting-system-main/anonymous-verifiable-voting-system/tests/integration/votingFlow.test.js): **12 passed, 0 failed**
- [`tests/integration/endToEndVotingSystem.test.js`](file:///c:/Users/User/Downloads/anonymous-verifiable-voting-system-main/anonymous-verifiable-voting-system/tests/integration/endToEndVotingSystem.test.js): **9 passed, 0 failed**
- **Total Integration Tests:** **21 passed, 0 failed**

---

## 5. Attack Demonstration

To enable clear, transparent grading and interactive evaluation, the repository includes an automated, self-contained attack demonstration script located at [`scripts/demonstrate-attacks.js`](file:///c:/Users/User/Downloads/anonymous-verifiable-voting-system-main/anonymous-verifiable-voting-system/scripts/demonstrate-attacks.js).

### 5.1 Adversarial Scenarios Demonstrated

```
╔════════════════════════════════════════════════════════════════════╗
║  ANONYMOUS VERIFIABLE VOTING SYSTEM — SECURITY ATTACK SUITE        ║
║  Part 10: Automated Security Testing & Attack Demonstration       ║
╚════════════════════════════════════════════════════════════════════╝
Operating in SAFE LOCAL TEST ENVIRONMENT — No external networks targeted.
```

1. **Scenario 1: Forged RSA Voting Token Injection**
   - *Adversary Strategy:* An attacker generates their own 2048-bit RSA key pair, crafts a random 32-byte token, signs it with their rogue private key, and submits it to `POST /api/vote/cast`.
   - *Security Defense:* The server verifies signatures exclusively using its trusted server public key (`publicKey.pem`). The signature check fails at Stage 1.
   - *Observed Result:* HTTP 401 Unauthorized (`"Token rejected: RSA signature is invalid or token was tampered with"`). **Defense Passed.**

2. **Scenario 2: Replay Attack & Double-Voting**
   - *Adversary Strategy:* An attacker intercepts a legitimate, server-issued voting token and submits it a second time to vote for a different candidate.
   - *Security Defense:* The server checks the token ledger in MongoDB. The token hash exists but has `used: true`.
   - *Observed Result:* HTTP 409 Conflict (`"Token rejected: this voting token has already been used (replay attack prevented)"`, `code: TOKEN_ALREADY_USED`). **Defense Passed.**

3. **Scenario 3: Tampered Ballot Data in Ledger (Insider Threat)**
   - *Adversary Strategy:* A rogue database administrator accesses the database directly and modifies a stored ballot's `candidateId` from Candidate A to Candidate B.
   - *Security Defense:* The verification service recomputes the expected receipt hash using the formula $\text{SHA-256}(\text{encryptedVote} : \text{iv} : \text{candidateId})$. The recomputed hash does not match the stored `receiptHash`.
   - *Observed Result:* HTTP 404 with status `"Tampered vote record"` and `code: INTEGRITY_FAILED`. Furthermore, during admin tally, AES-256-GCM authentication fails and increments `rejectedVotes`. **Defense Passed.**

4. **Scenario 4: OTP Multi-Factor Authentication Bypass**
   - *Adversary Strategy:* An attacker who obtains valid login credentials bypasses the OTP prompt and directly invokes `POST /api/token/generate`.
   - *Security Defense:* In `tokenController.js`, the server explicitly evaluates `if (!voter.otpVerified)` and aborts token issuance before loading keys.
   - *Observed Result:* HTTP 403 Forbidden (`"OTP verification required before a voting token can be issued"`). **Defense Passed.**

5. **Scenario 5: Privilege Escalation to Admin Operations (RBAC Bypass)**
   - *Adversary Strategy:* An authenticated voter with a legitimate JWT (`role: 'voter'`) attempts to access restricted admin endpoints (`POST /api/admin/tally` or `GET /api/admin/dashboard`).
   - *Security Defense:* The `adminOnly` middleware inspects `req.user.role`. Any non-admin token is rejected immediately.
   - *Observed Result:* HTTP 403 Forbidden (`"Admin access required"`). **Defense Passed.**

### 5.2 Command to Execute the Demonstration
```bash
npm run demonstrate:attacks
```
*Direct Node execution:*
```bash
node scripts/demonstrate-attacks.js
```
*Safety Note:* The demonstration script executes purely within an in-memory test harness on the local machine. It performs zero external network calls and does not touch production resources.

---

## 6. Test Results and Summary

All test suites were executed sequentially via `jest --runInBand`. The table below records the verified, observed execution results:

### 6.1 Test Execution Scorecard

| Suite Category | Suite File Path | Test Count | Passing | Failing | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Security** | `tests/security/fakeToken.test.js` | 9 | 9 | 0 | 0.8 s |
| **Security** | `tests/security/reusedToken.test.js` | 7 | 7 | 0 | 0.7 s |
| **Security** | `tests/security/tamperedVote.test.js` | 8 | 8 | 0 | 0.8 s |
| **Security** | `tests/security/otpBypass.test.js` | 6 | 6 | 0 | 0.8 s |
| **Security** | `tests/security/unauthorizedAdmin.test.js` | 14 | 14 | 0 | 1.1 s |
| **Security** | `tests/security/tokenReplayAttack.test.js` | 10 | 10 | 0 | 1.0 s |
| **Security** | `tests/security/invalidReceipt.test.js` | 6 | 6 | 0 | 0.7 s |
| **Integration** | `tests/integration/votingFlow.test.js` | 12 | 12 | 0 | 2.1 s |
| **Integration** | `tests/integration/endToEndVotingSystem.test.js` | 9 | 9 | 0 | 1.9 s |
| **Unit** | `tests/unit/tokenGeneration.test.js` | 13 | 13 | 0 | 0.9 s |
| **Unit** | `tests/unit/tokenVerification.test.js` | 8 | 8 | 0 | 0.7 s |
| **Unit** | `tests/unit/verification.test.js` | 21 | 21 | 0 | 0.9 s |
| **Unit** | `tests/unit/aes.test.js` | 33 | 33 | 0 | 1.0 s |
| **Unit** | `tests/unit/rsa.test.js` | 7 | 7 | 0 | 0.6 s |
| **Unit** | `tests/unit/otp.test.js` | 1 | 1 | 0 | 0.5 s |
| **Unit** | `tests/unit/sha256.test.js` | 8 | 8 | 0 | 0.5 s |
| **TOTAL** | **16 Test Suites** | **172** | **172** | **0** | **15.3 s** |

- **Total Test Suites Executed:** 16 (16 passed, 0 failed)
- **Total Tests Executed:** 172 (172 passed, 0 failed)
- **Blocked or Not-Run Tests:** 0
- **Test Pass Rate:** **100.0%**

---

## 7. Security Findings, Limitations, and Recommendations

To maintain academic rigor, genuine confirmed findings from code inspection and test execution are distinguished below from potential risks and future architectural recommendations.

### 7.1 Confirmed Code Findings
1. **Placeholder Stubs Replaced (Quality Assurance):**
   - *Finding:* The original repository contained 5 placeholder security test files with single-line `expect(true).toBe(true)` assertions.
   - *Resolution:* All 5 files were refactored into thorough, multi-scenario test suites exercising true cryptographic and HTTP controller behavior.
2. **Race-Safe Double-Vote Prevention (Verified):**
   - *Finding:* A common vulnerability in online voting is a check-then-act race condition where concurrent requests reuse the same token.
   - *Verification:* In `backend/services/tokenVerificationService.js`, `markTokenAsUsed` uses `VotingToken.findOneAndUpdate({ tokenHash, used: false }, { used: true, usedAt: new Date() })`. This atomic operation guarantees that under simultaneous submissions with the same token, exactly one succeeds and the other receives `null` and is rejected with HTTP 409. Verified by test `TC-SEC-14`.
3. **AEAD Authenticated Encryption (Verified):**
   - *Finding:* Traditional AES-CBC or AES-CTR encryption without MAC is vulnerable to chosen-ciphertext and bit-flipping attacks.
   - *Verification:* The system uses `aes-256-gcm`. The 16-byte authentication tag is generated on encryption and verified on decryption. Any alteration of ciphertext, IV, or authTag causes an immediate exception during `decipher.final()`. Verified by test `TC-SEC-17`.
4. **Voter Anonymity Preservation (Verified):**
   - *Finding:* If voter identity is stored alongside ballot receipts, voter anonymity is destroyed.
   - *Verification:* The `VotingToken` collection stores only the SHA-256 hash of the random token, with no voter reference. The `Vote` collection stores only `encryptedVote`, `iv`, `authTag`, `receiptHash`, and `candidateId`. The public bulletin board query strictly projects non-sensitive fields. Verified by test `TC-SEC-60`.

### 7.2 Identified Limitations (Supported by Code Inspection)
1. **Absence of Rate-Limiting on OTP and Login Routes:**
   - *Code Observation:* In `backend/controllers/authController.js`, `verifyOTP` compares the 6-digit `otpCode` directly without request rate limiting or attempt throttling.
   - *Risk:* An attacker could theoretically attempt an automated brute-force search over the $10^6$ possible OTP combinations before the user notices.
2. **Local Key Storage on Disk:**
   - *Code Observation:* In `backend/crypto/keyManager.js`, the RSA server private key is stored at `./keys/private.pem` on the local file system. The AES secret key is read from the `AES_SECRET_KEY` environment variable.
   - *Risk:* If the host operating system or backup storage is compromised, an attacker gaining read access to the server disk could obtain the signing key and forge tokens.
3. **Centralized Symmetric Key for Tallying:**
   - *Code Observation:* In `backend/services/tallyService.js`, the server decrypts all votes using a single shared symmetric AES key held in server environment variables.
   - *Risk:* An unscrupulous system administrator possessing the AES key could decrypt ballots prior to election close if they could access the raw database.

### 7.3 Practical Future Recommendations
1. **Rate Limiting Middleware:**
   - Integrate `express-rate-limit` on `/api/auth/login` and `/api/auth/verify-otp` (e.g., maximum 5 attempts per voterId/IP per 15-minute window).
2. **Hardware Security Module (HSM) / KMS Key Storage:**
   - For enterprise deployment, store the RSA private key in a FIPS 140-2 Level 3 Hardware Security Module (HSM) or a cloud KMS (AWS KMS, Google Cloud KMS) where the private key never leaves secure memory.
3. **Threshold Cryptography & Homomorphic Encryption:**
   - Replace symmetric AES-256-GCM with Paillier homomorphic encryption or a $(t, n)$ threshold decryption scheme (e.g., Shamir's Secret Sharing). In a threshold scheme, multiple independent election trustees must cooperate to decrypt the election tally, ensuring no single entity can decrypt ballots unilaterally.

---

## 8. Test Execution Commands

The exact commands configured and supported by `package.json` for running the testing and demonstration suites are listed below:

### 8.1 Run Complete Test Suite (All 16 Suites, 172 Tests)
```bash
npm test
```
*On Windows PowerShell:*
```powershell
npm.cmd test
```

### 8.2 Run Security Tests Only (7 Suites, 60 Tests)
```bash
npm run test:security
```
*On Windows PowerShell:*
```powershell
npm.cmd run test:security
```

### 8.3 Run System Integration Tests (2 Suites, 21 Tests)
```bash
npm run test:integration
```
*On Windows PowerShell:*
```powershell
npm.cmd run test:integration
```

### 8.4 Run Unit Tests Only (7 Suites, 91 Tests)
```bash
npm run test:unit
```
*On Windows PowerShell:*
```powershell
npm.cmd run test:unit
```

### 8.5 Run Automated Attack Demonstration
```bash
npm run demonstrate:attacks
```
*On Windows PowerShell:*
```powershell
npm.cmd run demonstrate:attacks
```
*Or directly via Node.js:*
```bash
node scripts/demonstrate-attacks.js
```

### 8.6 Run Specialized Token Replay Suite (Arya Akhade — Part 4)
```bash
npm run test:part4
```

---

## 9. Academic Conclusion

The security testing, attack demonstration, and system integration conducted for **Part 10** demonstrate that the **Anonymous Verifiable Voting System** adheres to core principles of Cryptography and Network Security (CNS):

1. **Confidentiality:** Guaranteed through AES-256-GCM AEAD encryption of ballot payloads at rest, with the public bulletin board exposing zero voter identity data.
2. **Integrity:** Guaranteed through RSA-2048 digital signatures on anonymous voting tokens, GCM authentication tags on encrypted ballots, and SHA-256 digests on vote receipts.
3. **Authenticity:** Enforced via bcrypt credential verification, Multi-Factor Authentication (OTP gating), and server public-key signature verification.
4. **Non-Repudiation and Double-Voting Resistance:** Achieved through single-use anonymous tokens guarded by atomic MongoDB updates (`findOneAndUpdate`) and account-level voting flags.
5. **Verifiability:** Delivered via SHA-256 receipt hashes published to the public bulletin board, allowing individual voters to independently verify ballot inclusion without leaking vote choice.

With all **16 test suites (172 tests)** passing and **5 out of 5 adversarial attack demonstrations** neutralized, the implementation is robust, verified, and suitable for college project submission. Future production hardening should focus on rate limiting, threshold key management, and cloud KMS integration.
