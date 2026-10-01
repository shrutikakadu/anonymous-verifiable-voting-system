# Database Design

## Voter

- name
- voterId
- email
- passwordHash
- isEligible
- hasVoted
- createdAt

## VotingToken

- tokenHash
- used
- createdAt
- usedAt

## Vote

- encryptedVote
- iv
- receiptHash
- timestamp

## Admin

- username
- passwordHash
- role

These models intentionally keep authentication and anonymous voting data separate.
