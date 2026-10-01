# Admin schema

```js
{
  username: String,
  passwordHash: String,
  role: String
}
```

This schema stores admin authentication only. Admin APIs are protected and separate from voter data.
