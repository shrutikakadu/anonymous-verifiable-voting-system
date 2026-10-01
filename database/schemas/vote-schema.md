# Vote schema

```js
{
  encryptedVote: String,
  iv: String,
  receiptHash: String,
  candidateId: String,
  timestamp: Date
}
```

The vote object does not include voter identity for anonymity. Only the encrypted vote, IV, candidate ID, and receipt hash are stored.
