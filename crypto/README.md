# Crypto Module

This folder contains reusable cryptographic utilities for the voting system.

- RSA: signing and verification of anonymous tokens
- AES: encrypting vote payloads before persistence
- SHA-256: hashing tokens and receipts

Important: do not hard-code keys or secrets in source code. Use environment variables or secure local key files for development.
