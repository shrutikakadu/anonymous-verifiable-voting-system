# System Architecture

This project follows a modular architecture designed for a 10-member student team.

## Frontend

The React app handles registration, login, OTP verification, voting flow, public bulletin board, and admin interface.

## Backend

The Express API manages voter identity, anonymous voting tokens, encrypted ballots, verification, and secure tallying logic.

## Database

MongoDB stores voter metadata, admin credentials, anonymous tokens, and receipt information without associating voter identity with cast votes.

## Cryptography

RSA signs anonymous tokens and AES encrypts vote contents before persistence. SHA-256 provides receipt integrity and token hashing.

## Security boundary

Authentication data and anonymous voting data are kept logically separate so that voter identity cannot be correlated with the real ballot.
