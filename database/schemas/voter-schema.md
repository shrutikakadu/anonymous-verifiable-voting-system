# Voter schema

```js
{
  name: String,
  voterId: String,
  email: String,
  passwordHash: String,
  isEligible: Boolean,
  hasVoted: Boolean,
  otpCode: String | null,
  otpVerified: Boolean,
  createdAt: Date
}
```

This schema stores voter identity and authentication data. It intentionally does not contain the actual vote.
