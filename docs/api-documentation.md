# API Documentation

## Authentication APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-otp`
- `POST /api/auth/logout`

## Token APIs

- `POST /api/token/generate`
- `POST /api/token/verify`

## Vote APIs

- `POST /api/vote/cast`

## Verification APIs

- `GET /api/verification/bulletin-board`
- `GET /api/verification/:receiptHash`

## Admin APIs

- `POST /api/admin/login`
- `GET /api/admin/dashboard`
- `POST /api/admin/tally`
