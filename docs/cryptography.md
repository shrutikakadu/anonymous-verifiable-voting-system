# Cryptography Design

- RSA signing for anonymous voting tokens
- AES-256 encryption for vote confidentiality
- SHA-256 hashing for token and receipt integrity
- JWT for authenticated sessions
- Secret material stored in environment variables and key files

Important cryptographic operations are split into dedicated modules to make the system easier for students to explain and maintain.
