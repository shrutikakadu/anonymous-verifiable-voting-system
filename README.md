# Anonymous Verifiable Voting System

## Project title

Anonymous Verifiable Voting System

## Problem statement

Many online voting systems struggle to balance voter privacy, secure authentication, and public verifiability. A college-level election system must allow students to vote anonymously while still proving that a vote was cast legitimately, not duplicated, and tallied correctly.

## Objectives

- Provide a secure and anonymous voting flow for a college election.
- Keep voter identity separate from the actual vote.
- Allow voter's receipt generation without exposing the vote itself.
- Enable public verification of vote receipt integrity.
- Support admin-only tally after the election closes.
- Create a project structure that a 10-member student team can implement independently.

## Features

- Voter registration with password hashing.
- Login with voter ID and password.
- OTP verification before voting session activation.
- JWT-based secure session management.
- Anonymous RSA-signed voting tokens.
- Double-vote prevention with token reuse detection.
- AES encryption of vote payload before storage.
- SHA-256 receipt generation for transparent verification.
- Public bulletin board with anonymous receipt hashes.
- Admin login and protected tally APIs.
- Secure vote tallying after auth validation.

## Architecture overview

The application is split into a React frontend and an Express backend. The backend stores authentication and voter identity in one logic domain and stores anonymous ballot metadata in another domain. This separation preserves anonymity while still enabling complete auditability.

## Tech stack

- Frontend: React.js + Vite
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Cryptography: Node.js built-in crypto module
- Authentication: JWT + bcrypt
- OTP: Nodemailer
- API communication: Axios
- Environment variables: dotenv
- Testing: Jest

## Folder structure

```text
anonymous-verifiable-voting-system/
├── frontend/
├── backend/
├── database/
├── crypto/
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── PROJECT_STRUCTURE.md
```

## Installation

1. Clone the project.
2. Run `npm install` at the project root.
3. Install frontend dependencies: `npm install --prefix frontend`.
4. Install backend dependencies: `npm install --prefix backend`.
5. Create `.env` files using `.env.example` as a template.

## Environment setup

Create a root `.env` file as required for backend configuration. Keep secrets out of version control.

```env
MONGO_URI=mongodb://localhost:27017/anonymous-voting
JWT_SECRET=your_secret_here
OTP_EMAIL=example@email.com
OTP_EMAIL_PASSWORD=your_app_password
RSA_PRIVATE_KEY_PATH=./keys/private.pem
RSA_PUBLIC_KEY_PATH=./keys/public.pem
AES_SECRET_KEY=your_32_char_key
PORT=5000
```

## MongoDB setup

- Install MongoDB locally or use MongoDB Atlas.
- Create a database named `anonymous-voting`.
- Ensure the application user has read and write access.
- Keep the `MONGO_URI` value in the environment file.

For a persistent registration demo, make sure the backend connects to the configured MongoDB instance. The development fallback can use an in-memory MongoDB when the configured URI is unavailable; that data is temporary and disappears when the process stops.

## Backend setup

```bash
cd backend
npm install
npm run dev
```

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

## API endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-otp`
- `POST /api/auth/logout`

### Voter registration demo

The registration form at `http://localhost:5173/register` submits to `POST /api/auth/register`. Send `name`, `voterId`, `email`, and a password of at least 8 characters. The API trims the name and voter ID, stores voter IDs uppercase and email lowercase, rejects duplicate voter IDs or emails with HTTP `409`, and hashes the password with bcrypt before MongoDB receives the voter document. The response deliberately omits both the password and its hash.

1. Start MongoDB and set `MONGO_URI` in the root `.env` file. For example: `mongodb://localhost:27017/anonymous-voting`.
2. Follow the backend and frontend setup instructions above.
3. Register at `http://localhost:5173/register` with a new voter ID and email. Without SMTP credentials, the OTP service prints the development OTP in the backend terminal.
4. Confirm the record and bcrypt hash in `mongosh`:

   ```javascript
   use anonymous-voting
   db.voters.findOne(
     { voterId: "DEMO001" },
     { name: 1, voterId: 1, email: 1, passwordHash: 1, _id: 0 }
   )
   ```

   `passwordHash` should start with a bcrypt marker such as `$2a$` or `$2b$` and must not equal the password entered in the form. The `passwordHash` field is excluded from normal Mongoose query results unless explicitly selected by the login code.
5. Submit the same voter ID or email again to see the duplicate registration response. Then log in with the voter ID and password to demonstrate bcrypt comparison.

The login step is separate from registration. Registration stores the voter and prepares the OTP used by the README's later authentication flow.

### Voting token

- `POST /api/token/generate`
- `POST /api/token/verify`

### Vote

- `POST /api/vote/cast`

### Verification

- `GET /api/verification/bulletin-board`
- `GET /api/verification/:receiptHash`

### Admin

- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `POST /api/admin/tally`

## Cryptographic techniques used

- RSA 2048-bit key pair for anonymous vote token signing.
- Public key validation of token signature.
- AES-256 encryption for vote payload confidentiality.
- IV stored with each encrypted vote.
- SHA-256 hashing for token privacy and receipt integrity.
- JWT for authenticated user sessions.

## Security mechanisms

- Password hash using bcrypt.
- Voting tokens stored as SHA-256 hash only.
- Voter identity never stored with the actual vote.
- Double-vote prevention via used-token records.
- Admin-only routes with role checks.
- JWT verification on protected routes.
- Input validation on all public APIs.
- Receipt verification using hash comparison.

## Testing instructions

Run the full test suite from the project root:

```bash
npm test
```

Key test groups:

- `tests/unit/`
- `tests/security/`
- `tests/integration/`

## Complete voting flow

1. Register user.
2. Login with Voter ID and password.
3. Receive OTP and verify.
4. Request anonymous RSA-signed voting token.
5. Select candidate and generate vote payload.
6. Verify token signature and ensure not previously used.
7. Encrypt the vote with AES.
8. Generate SHA-256 receipt hash.
9. Store anonymous ballot data in secure storage.
10. Publish receipt hash to public bulletin board.
11. Admin authenticates and triggers tally after election close.
12. Verify results through public bulletin board and receipt checks.

## 10-member responsibility table

| Member | Responsibility | Assigned Member |
| --- | --- | --- |
| 1 | Voter registration + database | |
| 2 | Login + OTP + JWT | |
| 3 | RSA anonymous voting token | |
| 4 | Token verification + double-vote prevention | Arya Akhade |
| 5 | AES vote encryption | |
| 6 | Vote submission + receipt generation | |
| 7 | Bulletin board + verification + tally | Shrutika Kadu |
| 8 | Crypto utilities + security tests | Dakkshesh |
| 9 | Voter frontend + API integration | |
| 10 | Admin frontend + integration testing | |

## Implementation order

1. MongoDB + models
2. Registration
3. Login + OTP + JWT
4. RSA key generation
5. Anonymous token generation
6. Token verification + double vote prevention
7. AES vote encryption
8. Vote submission
9. SHA-256 receipt generation
10. Bulletin board
11. Receipt verification
12. Admin authentication
13. Secure tally
14. React frontend
15. Security testing
16. End-to-end testing

## Notes

This project is intentionally designed for student learning and team modularity. It avoids overly complex infrastructure while still showing the required secure voting principles.
