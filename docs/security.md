# Security Notes

- Passwords are hashed using bcrypt.
- Voting tokens are stored only as SHA-256 hashes.
- Voter identity is not stored with vote payloads.
- Admin routes are protected with JWT + admin role checks.
- Double-vote prevention uses token reuse detection.
- Receipt integrity is verified via hash comparison.
