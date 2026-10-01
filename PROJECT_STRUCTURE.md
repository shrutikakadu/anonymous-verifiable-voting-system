# Project Structure Overview

This repository follows a modular student-team development layout for the Anonymous Verifiable Voting System.

## Root modules

- `frontend/`: React + Vite interface for voters and admins
- `backend/`: Express API, routing, middleware, models, and business logic
- `database/`: MongoDB schema definitions and admin seeding scripts
- `crypto/`: standalone reusable cryptographic modules
- `tests/`: unit, security, and integration test suite
- `docs/`: architecture and API documentation

## Team ownership map

- Member 1: Voter registration and database model management
- Member 2: Login, OTP, JWT flow
- Member 3: RSA anonymous token creation
- Member 4: Token verification and double-vote prevention
- Member 5: AES encryption and key handling
- Member 6: Vote submission and receipt generation
- Member 7: Bulletin board, verification, and tally logic
- Member 8: Security tests and crypto utilities
- Member 9: Voter frontend and API integration
- Member 10: Admin frontend and E2E testing

## Key architectural rule

Authentication data, voter identity data, and anonymous voting receipts are intentionally separated to preserve voter privacy while preserving verifiability.
