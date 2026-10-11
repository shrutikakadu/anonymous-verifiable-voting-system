# 📘 Part 7: Public Bulletin Board & Vote Verification
**Assigned to:** Shrutika Kadu  
**Module:** Part 7 — Bulletin Board + Vote Verification  
**Course / Subject:** Cryptography and Network Security (CNS) Lab  
**Project:** Anonymous Verifiable Voting System  
**GitHub Repository:** https://github.com/shrutikakadu/anonymous-verifiable-voting-system  
**Branch:** `main` (merged and pushed ✅)

---

## ✅ FINAL STATUS — PART 7 IS 100% COMPLETE

> **Part 7 (Shrutika) is fully implemented, tested, merged into `main`, and pushed to GitHub.**  
> Other members can now pull the latest code and build their parts on top of this.

### Git Proof (Latest Commits on `main`):
```
22ea2d6  fix(db): graceful fallback when mongodb-memory-server unavailable
e9d5d0a  docs: update Part 7 guide
5bfb483  feat: complete end-to-end frontend voting workflow and AES-GCM tally
ab540ad  feat(part6): implement vote submission API and SHA-256 receipts
2b6dfe7  feat(part7): Complete Bulletin Board and Vote Receipt Verification
```

### Test Results (Live Proof — Run Yourself):
```
PASS  tests/unit/verification.test.js       ← Part 7 Unit Tests
PASS  tests/security/invalidReceipt.test.js  ← Part 7 Security Tests
PASS  tests/security/tamperedVote.test.js    ← Part 7 Tamper Tests

Test Suites: 14 passed, 14 total
Tests:       112 passed, 112 total   ← ALL GREEN ✅
```

---

## 1. What Is Part 7? (In Simple Words)

In traditional online voting, voters cannot tell if their vote was actually counted, secretly altered, or discarded. But if you reveal who voted for what, voter anonymity is destroyed!

**Part 7 solves this critical dilemma using cryptography:**

1. **Public Bulletin Board** — A transparent, public ledger where anyone (voters, election observers, the public) can see a list of anonymous cryptographic vote receipt hashes (`SHA-256`) and the **total number of votes cast**. No voter names or candidate choices are ever leaked.

2. **Individual Vote Verification** — A tool where a voter pastes their private receipt hash (received after voting). The backend performs a 3-stage cryptographic audit and displays **"Vote included"** ✅ if valid, or **"Not verified"** ❌ if the receipt is fake, forged, or tampered with.

**CNS Concepts Covered:**
- SHA-256 Hashing (Cryptographic Integrity)
- Public Verifiability without breaking Anonymity
- Tamper Evidence (Hash Recomputation)
- Attack Prevention (Receipt Forgery, Format Injection)

---

## 2. How Part 7 Fits in the Complete System

```
[Member 1: Register] ──▶ [Member 2: Login + OTP] ──▶ [Member 3: RSA Token Issued]
                                                               │
                                                               ▼
[Member 6: Vote Cast & Receipt Generated] ◀── [Member 5: AES Encrypt] ◀── [Member 4: Verify Token]
       │
       ▼
 ┌──────────────────────────────────────────────────────────────────┐
 │                    ⭐ PART 7 (SHRUTIKA) ⭐                        │
 │  1. Public Bulletin Board (Shows all SHA-256 receipt hashes)     │
 │  2. Individual Vote Verification ("Vote Included" proof)         │
 │  3. Database Tamper Detection (SHA-256 recomputation check)      │
 └──────────────────────────────────────────────────────────────────┘
       │
       ▼
[Member 8: Admin Tallies Votes] ──▶ Tally totalVotes MUST match Bulletin Board totalVotes!
```

---

## 3. ALL Files That Belong to Part 7

### Backend Files

| File | What It Does |
| :--- | :--- |
| `backend/services/verificationService.js` | **Core Crypto Logic:** Validates 64-char SHA-256 hex, searches MongoDB, recomputes SHA-256 to detect tampering, returns `"Vote included"` |
| `backend/controllers/verificationController.js` | **API Controllers:** Handles `getBulletinBoard`, `getStats`, `verifyReceipt`, `verifyReceiptBody` |
| `backend/routes/verificationRoutes.js` | **Routes:** Exposes all 4 API endpoints |
| `backend/config/db.js` | **DB Config:** Fixed crash bug — graceful in-memory MongoDB fallback |

**API Endpoints:**
```
GET  /api/verification/bulletin-board    → Public list of receipt hashes + totalVotes
GET  /api/verification/stats             → { totalVotes, latestVoteTimestamp }
GET  /api/verification/:receiptHash      → Verify via URL param
POST /api/verification/verify-receipt    → Verify via request body
```

### Frontend Files

| File | What It Does |
| :--- | :--- |
| `frontend/src/pages/public/BulletinBoard.jsx` | **Bulletin Board Page** (homepage `/`) — Total votes counter, search/filter, receipt hash table, copy buttons, "Verify ↗" links |
| `frontend/src/pages/voter/VerifyVote.jsx` | **Verification Page** (`/verify-vote`) — Receipt hash input, paste, 3-stage validation, green/red result badge |
| `frontend/src/services/verificationService.js` | **Axios API Client** — `fetchBulletinBoard()`, `verifyReceipt()`, `fetchVerificationStats()` |
| `frontend/src/components/Navbar.jsx` | **Navbar** — Links to Bulletin Board and Verify Vote |
| `frontend/src/index.css` | **Styling** — Dark theme, badge colors, stat cards |
| `frontend/src/App.jsx` | **Routing** — `/` → BulletinBoard, `/verify-vote` → VerifyVote |

### Test Files

| File | Tests | Status |
| :--- | :--- | :--- |
| `tests/unit/verification.test.js` | Bulletin board retrieval, pagination, search, SHA-256 validation, receipt verification, tamper detection | ✅ PASS |
| `tests/security/invalidReceipt.test.js` | Forged receipt (404), malformed hash (400), NoSQL injection, privacy check | ✅ PASS |
| `tests/security/tamperedVote.test.js` | MongoDB tamper detected via SHA-256 hash mismatch | ✅ PASS |

### Demo & Docs Files

| File | Purpose |
| :--- | :--- |
| `test-part7-api.js` | Terminal demo script — run to show live API to examiner |
| `docs/PART_7_SHRUTIKA_GUIDE.md` | This complete guide |

---

## 4. How to Run Part 7 — All Commands

### For Teammates: Pull Latest Code First
```bash
git checkout main
git pull origin main
```

### Install Dependencies (First Time Only)
```bash
npm install                     # root
npm install --prefix backend    # backend
npm install --prefix frontend   # frontend
```

### Start the Backend Server
```bash
npm run dev --prefix backend
```
**Expected output:**
```
⚠️  MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017
🔄 Trying In-Memory MongoDB fallback...
✅ In-Memory MongoDB connected: mongodb://127.0.0.1:XXXXX/
ℹ️  Note: Data will NOT persist between server restarts.
Server running on port 5000
```
> The backend uses **In-Memory MongoDB** automatically if local MongoDB is not installed. One-time binary download (~200MB) on first run.

### Start the Frontend Server
```bash
npm run dev --prefix frontend
```
**Expected:** `➜  Local: http://localhost:5173/`

### Run Automated Tests (Show to Examiner)
```bash
npm run test:unit        # 91 unit tests
npm run test:security    # 21 security tests
```
**Expected:**
```
Tests: 112 passed, 112 total ✅
```

### Run Live API Demo (Terminal Proof for Examiner)
> Backend must be running first, then:
```bash
node test-part7-api.js
```
**Expected:**
```
✅ Bulletin Board: Total Recorded Votes: 0
✅ Stats: { success: true, totalVotes: 0 }
✅ Forged receipt rejected! (404 RECEIPT_NOT_FOUND)
✅ Malformed hash rejected! (400 INVALID_FORMAT)
🎉 PART 7 DEMONSTRATION COMPLETE!
```

### Test in the Browser
| URL | What You See |
| :--- | :--- |
| `http://localhost:5173/` | Public Bulletin Board — votes counter, search, receipt table |
| `http://localhost:5173/verify-vote` | Verification — paste hash → get green ✅ or red ❌ |

### Build for Production
```bash
npm run build --prefix frontend
```
> ⚠️ `npm run build` (without `--prefix frontend`) will fail — that is expected behavior.

---

## 5. Complete Work Done — Summary

### Backend Work:
- ✅ `verificationService.js` — `isValidSha256Hash()`, `getPublicBulletinBoard()`, `verifyVoteReceipt()`, `getBulletinBoardStats()`
- ✅ `verificationController.js` — 4 REST controllers
- ✅ `verificationRoutes.js` — 4 routes registered in Express
- ✅ `db.js` — Removed `process.exit(1)` crash; graceful in-memory fallback

### Frontend Work:
- ✅ `BulletinBoard.jsx` — Total vote count, real-time search, receipt table, copy buttons, verify links
- ✅ `VerifyVote.jsx` — Receipt input, clipboard paste, URL pre-fill (`?receipt=...`), green/red result cards
- ✅ `verificationService.js` — Axios API client
- ✅ `Navbar.jsx` — Bulletin Board and Verify Vote links

### Integration Work:
- ✅ Connected to **Part 5 (Rutuja)** — AES-256-GCM encrypted vote stored, receipt computed from ciphertext
- ✅ Connected to **Part 6 (Sayali)** — Vote cast → receipt instantly on Bulletin Board
- ✅ Connected to **Part 8 (Dakkshesh)** — Tally `totalVotes` matches Bulletin Board `totalVotes`
- ✅ `VoteConfirmation.jsx` — "Verify Vote on Bulletin Board" button links to `/verify-vote?receipt=<hash>`
- ✅ `tallyService.js` — Fixed to use AES-256-GCM `decryptAES()` with authenticated decryption
- ✅ `backend/.env` — Fixed `AES_SECRET_KEY` to valid 64-hex-char format

### Tests Written:
- ✅ `tests/unit/verification.test.js`
- ✅ `tests/security/invalidReceipt.test.js`
- ✅ `tests/security/tamperedVote.test.js`

---

## 6. Explaining to the Professor / Examiner

> *"Good morning/afternoon, Sir/Madam. I am Shrutika, responsible for **Part 7: Public Bulletin Board and Vote Verification**.*
>
> *Our system must guarantee two conflicting goals: Ballot Privacy and Public Verifiability. I solved this with cryptography:*
>
> *1. **Public Bulletin Board** — An append-only public ledger at the homepage. It displays SHA-256 cryptographic receipt hashes of all ballots and the total vote count. Anyone can verify X votes were cast, but no one can tell who voted for whom — complete anonymity is preserved.*
>
> *2. **Individual Verifiability** — After voting, each voter gets a SHA-256 receipt hash. Through my API and `/verify-vote` page, the voter pastes their hash. My backend performs 3-stage audit: (1) format validation, (2) database lookup, (3) SHA-256 recomputation from the encrypted ballot. If valid → 'Vote included'. This proves their vote was counted without revealing who they voted for.*
>
> *3. **Attack Prevention** — Fake receipt → HTTP 404 (RECEIPT_NOT_FOUND). Malformed hash → HTTP 400 (INVALID_FORMAT). Tampered MongoDB record → SHA-256 mismatch caught immediately.*
>
> *All 112 unit and security tests pass with 100% success. I will now demonstrate using `node test-part7-api.js`."*

---

## 7. Message to Send to Team Members

```
Hi team! 👋

✅ PART 7 (PUBLIC BULLETIN BOARD & VOTE VERIFICATION) IS COMPLETE!

What's done and merged into main:
• Public Bulletin Board API: GET /api/verification/bulletin-board
• Vote Verification API: GET /api/verification/:receiptHash
• Frontend BulletinBoard page at homepage /
• Frontend VerifyVote page at /verify-vote
• Fully integrated with Parts 5, 6, and 8
• 112 tests passing (91 unit + 21 security)
• Pushed and merged to origin/main ✅

To pull my work, run:
  git checkout main
  git pull origin main

Member 8 (Dakkshesh):
Your admin tally is already integrated! The AES-256-GCM tallyService 
is ready. Your totalVotes in the tally MUST match the totalVotes on 
the Bulletin Board — this proves no votes were added or lost.
Pull main and start your part!

— Shrutika 🛡️
```


---

## 1. What Is Your Part (Part 7) in Simple Words?

In traditional online voting, voters cannot tell if their vote was actually counted or secretly altered or discarded. But if you reveal who voted for what, voter anonymity is destroyed!

**Your role (Part 7) solves this critical dilemma:**
1. **Public Bulletin Board:** You provide a transparent, public ledger where anyone in the world (voters, election observers, public) can see a list of anonymous cryptographic vote receipt hashes (`SHA-256`) and the **total number of votes cast**. No voter names or secret choices are ever leaked.
2. **Individual Verifiability ("Verify My Vote"):** You provide a verification tool where a student/voter pastes their private receipt hash (which they received when they voted). Your backend searches the database, performs cryptographic integrity checks, and displays **"Vote included"** with a green checkmark! If someone enters a fake or forged receipt, it is immediately rejected as **"Not verified"**.

---

## 2. Where Does Your Part Fit Among All 10 Members?

Here is the complete journey of a vote in the system:

```text
[Member 1: Register] ──▶ [Member 2: Login + OTP] ──▶ [Member 3: RSA Token Issued]
                                                               │
                                                               ▼
[Member 6: Vote Cast & Receipt Generated] ◀── [Member 5: AES Encrypt Vote] ◀── [Member 4: Verify Token]
       │
       ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                     ⭐ PART 7 (SHRUTIKA) ⭐                   │
 │  1. Public Bulletin Board (Displays receipt hash & count)    │
 │  2. Independent Vote Verification ("Vote Included" proof)    │
 └──────────────────────────────────────────────────────────────┘
       │
       ▼
[Member 8: Admin Closes Election & Tallies] ──▶ Total tally matches Part 7 Bulletin Board Count!
```

- **Member 6** creates the vote and generates the receipt hash `SHA-256(encryptedVote:iv:candidateId)`.
- **YOU (Member 7)** take that receipt, display it publicly on the Bulletin Board, and allow voters to verify it at `/verify-vote`.
- **Member 8** tallies votes at the end. The total count tallied by the admin MUST match the `totalVotes` count on your Bulletin Board.
- **Member 9** connects the voter UI and redirects voters to your verification page after voting.

---

## 3. Which Files Belong to You (Shrutika)?

All your files are organized across backend, frontend, tests, and demo scripts:

| File Location | Purpose & Functionality |
| :--- | :--- |
| [`backend/services/verificationService.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/backend/services/verificationService.js) | **Core Business & Crypto Logic:** Calculates total votes, filters bulletin board, validates 64-char SHA-256 format, searches MongoDB, recomputes hashes to detect database tampering, and outputs `"Vote included"`. |
| [`backend/controllers/verificationController.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/backend/controllers/verificationController.js) | **API Controllers:** Handles `getBulletinBoard`, `getStats`, `verifyReceipt`, and `verifyReceiptBody`. |
| [`backend/routes/verificationRoutes.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/backend/routes/verificationRoutes.js) | **Routing:** Exposes `/api/verification/bulletin-board`, `/api/verification/stats`, `/api/verification/verify`, and `/api/verification/:receiptHash`. |
| [`frontend/src/services/verificationService.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/frontend/src/services/verificationService.js) | **Axios API Client:** Helper functions (`fetchBulletinBoard`, `verifyReceipt`, `fetchVerificationStats`) to call the backend. |
| [`frontend/src/pages/public/BulletinBoard.jsx`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/frontend/src/pages/public/BulletinBoard.jsx) | **Public Bulletin Board UI:** Live total votes counter, real-time search/filter, table of receipt hashes, copy buttons, and one-click "Verify ↗" links. |
| [`frontend/src/pages/voter/VerifyVote.jsx`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/frontend/src/pages/voter/VerifyVote.jsx) | **Vote Verification UI:** Input box for receipt hash, clipboard paste button, format validation, green "Vote Included" card, red "Not Verified" card, and CNS audit guide. |
| [`frontend/src/components/Navbar.jsx`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/frontend/src/components/Navbar.jsx) | **Navigation:** Direct navigation links to `📋 Bulletin Board` and `🔍 Verify Vote`. |
| [`frontend/src/index.css`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/frontend/src/index.css) | **Styling:** Premium dark theme, badges, status colors, table styles, and stat cards. |
| [`tests/unit/verification.test.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/tests/unit/verification.test.js) | **Unit Tests:** Tests bulletin board retrieval, search filter, SHA-256 validation, valid verification, and tampering detection. |
| [`tests/security/invalidReceipt.test.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/tests/security/invalidReceipt.test.js) | **Security Tests:** Rejection of forged receipts, rejection of malformed/NoSQL injection inputs, database tampering detection, and privacy protection. |
| [`test-part7-api.js`](file:///c:/Users/USER/Desktop/CNS_lab/anonymous-verifiable-voting-system/test-part7-api.js) | **API Demo Script:** Live test script demonstrating Bulletin Board + Verification API from the terminal. |

---

## 4. Is Your Work Done Right Now?

### **YES! Your work is 100% complete, fully tested, and pushed.**
- All backend routes, controllers, and services are fully written, working, and integrated with Part 5 (AES-GCM) and Part 6 (Vote casting & receipt).
- Both frontend pages (`BulletinBoard.jsx` and `VerifyVote.jsx`) are fully designed, interactive, and connected to the backend.
- All **112 automated tests** across the entire repository pass with **100% success** (91 unit tests + 21 security tests).
- The frontend build compiles cleanly with **0 errors** (`npm run build --prefix frontend`).
- Your code is fully integrated and pushed to GitHub `origin/main`.

---

## 5. How to Run and Test Your Part (Step-by-Step)

### Step 1: Run the Automated Tests
In your terminal in the project root:
```bash
npm run test:unit
npm run test:security
```
**What to look for:**
- `PASS tests/unit/verification.test.js`
- `PASS tests/security/invalidReceipt.test.js`
- `PASS tests/security/tamperedVote.test.js`
All 112 tests across 14 test suites will pass with green checkmarks!

### Step 2: Start the Backend and Frontend Servers
You can see both servers running right now in your IDE, but for reference:
- **Terminal 1 (Backend):**
  ```bash
  npm run dev --prefix backend
  ```
  *(Runs backend on port 5000)*
- **Terminal 2 (Frontend):**
  ```bash
  npm run dev --prefix frontend
  ```
  *(Runs Vite React frontend on http://localhost:5173)*

### Step 3: Run the Terminal Demo Script
To show the examiner/team your API working from the command line:
```bash
node test-part7-api.js
```
This tests:
1. Fetching the public bulletin board and total vote count.
2. Fetching verification statistics.
3. Rejecting a fake/forged receipt hash (`404 Not Found`).
4. Rejecting a malformed hash (`400 Bad Request`).

### Step 4: Test in the Browser UI
1. Open your browser at **`http://localhost:5173/`**:
   - You will see the **Public Cryptographic Bulletin Board**.
   - Notice the **Total Recorded Votes** stat card.
   - You can type in the search bar to filter receipts.
   - You can click **"📋 Copy"** to copy any receipt hash.
   - You can click **"Verify ↗"** to immediately open the verification page with that receipt pre-filled!
2. Open **`http://localhost:5173/verify-vote`**:
   - Try entering an invalid hash like `12345` or `ffff...ffff` and click **"🔍 Verify"**:
     - ❌ Red Alert: *"Vote Not Found. This receipt hash does not exist in the recorded ballot database."*
   - Enter a valid receipt from the Bulletin Board and click **"🔍 Verify"**:
     - ✅ Green Alert: **"Vote Included"** with timestamp and cryptographic proof confirmation!

---

## 6. What Should You Do Once Other Members Finish Their Work?

When other teammates finish their code, here is what you should check:

### When Member 6 Finishes (Vote Submission & Receipt Generation)
- **What Member 6 does:** When a voter votes, Member 6 saves the vote in MongoDB and outputs a receipt hash.
- **What YOU do in the Web App:**
  1. Cast a vote through the application (or ask Member 6 to cast one).
  2. Immediately navigate to your **Bulletin Board (`/`)**.
  3. **Check:** The new receipt hash should instantly appear on your bulletin board, and the **Total Recorded Votes** count should increase by 1!
  4. Copy that receipt hash, paste it into **`http://localhost:5173/verify-vote`**, and confirm it shows **"Vote Included"**.

### When Member 9 Finishes (Voter Dashboard & Frontend Flow)
- **What Member 9 does:** Builds the voter UI and the final vote confirmation screen (`VoteConfirmation.jsx`).
- **What YOU do in the Web App:**
  - Check that on Member 9's confirmation screen, there is a button:
    `"Verify Vote on Bulletin Board" -> /verify-vote?receipt=${receiptHash}`
  - Clicking this button should take the voter directly to your page with their receipt pre-filled and verified!

### When Member 8 Finishes (Admin Tally)
- **What Member 8 does:** Admin logs in and clicks "Tally Votes" to count how many votes each candidate got.
- **What YOU do in the Web App:**
  - Verify that the total votes counted by Member 8 **exactly matches** the `totalVotes` shown on your Public Bulletin Board. This proves no votes were added or lost!

### When Member 10 Finishes (Security Testing & Attack Demos)
- **What Member 10 does:** Demonstrates security attacks to the professor.
- **What YOU do:**
  - Provide Member 10 with the invalid receipt attack test (`tests/security/invalidReceipt.test.js`) and show how your verification logic blocks forged receipts and detects tampered database records.

---

## 7. How to Explain Your Part to the Professor / Examiner

When presenting Part 7, use this exact script:

> *"Good morning/afternoon, Sir/Madam. I am Shrutika, and I am responsible for **Part 7: The Public Bulletin Board and Vote Verification module**.*
>
> *In our anonymous voting system, we need to guarantee two conflicting goals: **Ballot Privacy** and **Public Verifiability**.*
>
> *1. **Public Bulletin Board:** I implemented an append-only public ledger. It displays the SHA-256 cryptographic receipt hashes of all ballots cast and the total recorded votes count. An observer can see that the election has X recorded votes, but cannot tell who voted or which candidate was chosen.*
> *2. **Individual Verifiability:** Each voter receives a unique receipt hash. Through my receipt verification API (`/api/verification/:receiptHash`) and frontend page, the voter can enter their receipt hash. My backend performs a 3-stage audit: format validation, database lookup, and re-computing the SHA-256 hash across the encrypted ballot payload. If valid, it proves **'Vote included'**.*
> *3. **Tamper Evidence & Attack Prevention:** If an adversary submits a fake receipt, my system rejects it with HTTP 404. Furthermore, if someone tampers with the vote record inside MongoDB, the hash mismatch is caught immediately as an integrity violation.*
>
> *All unit tests and security tests for Part 7 are passing 100%."*
