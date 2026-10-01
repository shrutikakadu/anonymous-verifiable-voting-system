# Voting token schema

```js
{
  tokenHash: String,
  used: Boolean,
  createdAt: Date,
  usedAt: Date | null
}
```

The raw voting token is never stored. Only the SHA-256 hash is stored for replay prevention and verification.
