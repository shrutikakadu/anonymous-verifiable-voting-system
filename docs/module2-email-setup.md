# Module 2: Windows setup and real Gmail verification

## What must be configured locally

The backend loads `anonymous-verifiable-voting-system/.env` beside the `backend`
and `frontend` folders. It does not load `backend/.env`. Environment variables
provided by the shell/service also work; an existing environment variable takes
precedence over the dotenv file. Never put sender credentials in frontend
`VITE_` variables, source code, Git, screenshots or chat.

The missing local file was the reported incident's immediate cause. The old
service silently logged OTPs without sending mail. The repaired service does
not log OTPs and reports missing/failed email delivery explicitly.

## PowerShell setup

Open PowerShell in the correct existing checkout, replacing the example path:

```powershell
Set-Location 'C:\path\to\anonymous-verifiable-voting-system'
git branch --show-current
```

The branch must be `feature/member2-auth-complete`. Do not switch branches with
uncommitted work or run destructive cleanup/reset commands.

Install the dependencies pinned in the existing lockfiles:

```powershell
npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

Create the local file only if it is absent; never overwrite existing settings:

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
notepad .env
```

In Notepad, set these entries locally, using actual values in place of the
descriptions below. Do not leave the descriptions as literal values:

```dotenv
OTP_EMAIL=YOUR_SENDER_GMAIL_ADDRESS
OTP_EMAIL_PASSWORD=YOUR_VALID_GOOGLE_APP_PASSWORD
JWT_SECRET=YOUR_PRIVATE_RANDOM_SIGNING_SECRET
MONGO_URI=YOUR_EXISTING_PERSISTENT_MONGODB_CONNECTION_STRING
```

`OTP_EMAIL` is the sender account; the voter email entered during registration
is the recipient. Having only the voter/recipient address does not configure
the sender. Use the sender account's Google App Password for this existing
password-based Gmail transport. Google requires 2-Step Verification for App
Passwords; account policies may prevent their use. See Google's current guide:
https://support.google.com/accounts/answer/185833

If needed, generate a private random JWT signing secret on your own computer:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy that local output into `JWT_SECRET`; do not share or commit it. Changing an
existing JWT signing secret invalidates existing sessions, so retain the
established private value when one already exists. Production refuses the known
development/template signing secret for Module 2 login.

Preserve all unrelated project settings and keys. Do not replace teammates'
RSA/AES/admin configuration. Use a running persistent MongoDB instance with the
existing team connection string. The project's temporary fallback loses data
when replaced after restart; this repair deliberately leaves shared DB behavior
unchanged. If MongoDB is local, make sure its service is running. Do not clear
or recreate any database to resolve an authentication failure.

Confirm the file really is `.env`, not `.env.txt`, and remains ignored:

```powershell
Test-Path -LiteralPath '.env'
Test-Path -LiteralPath '.env.txt'
git check-ignore -- .env
git status --short
node scripts/check-auth-email.js --check
```

Expected: `.env` exists, `.env.txt` does not, and `.env` is ignored. The checker
prints presence flags without values. `EMAIL_LOADED`, `PASSWORD_LOADED`, and
`JWT_SECRET_CONFIGURED` should be true. This command does not contact Gmail.
If the file is absent but external environment variables are correctly set,
`ROOT_ENV: false` alone is not a failure.

## Optional real SMTP test on your computer

Use an inbox you control, replacing the example recipient:

```powershell
node scripts/check-auth-email.js --send-to 'YOUR_TEST_INBOX@gmail.com'
```

This intentionally sends one test email through the configured Gmail sender.
It does not register a voter, change any database, or verify an account. The
random test code is only in that email, never printed. SMTP acceptance means
the provider accepted the message; check the inbox/spam folder to confirm
arrival. A received test email proves that local sender can deliver to that
recipient at that time, not that all future emails will arrive.

Common results:

| Result | Next check |
|---|---|
| `OTP_EMAIL_NOT_CONFIGURED` | Correct root file, exact variable names, nonblank real sender credentials; remove template placeholders. |
| `EAUTH` | Correct sender account and valid App Password; follow Google account policy. |
| `ECONNECTION`, `ETIMEDOUT`, `ESOCKET`, `EDNS` | Internet/DNS/firewall and SMTP connectivity on that computer. |
| `EENVELOPE`, `OTP_EMAIL_REJECTED` | Valid intended recipient and provider acceptance. |
| Accepted but absent from inbox | Check spam and recipient correctness; acceptance alone is not inbox confirmation. |

## Verify the complete application flow

Start the backend from the repository root:

```powershell
npm run start --prefix backend
```

In a second PowerShell terminal in that same repository root:

```powershell
npm run dev --prefix frontend
```

Restart the backend after changing its environment. Restart Vite if changing a
frontend environment override. Leave `VITE_API_URL` unset for the normal local
proxy to `http://localhost:5000`; if an override is required, it must identify
the intended backend API base including `/api` and contain no sender secrets.

1. Open `http://localhost:5173/register`. Use a fresh synthetic voter ID/email
   for a test account; do not delete existing voters.
2. Check the registration email actually arrives in the intended inbox. Enter
   its code within five minutes. Registration verification must not sign in.
3. Log in with the same voter ID and password. Check the separate login email
   arrives, then enter that new code. Only now should the dashboard open.
4. Refresh the dashboard and confirm the tab session persists.
5. Log out. Confirm the login screen appears and refreshing/back navigation
   cannot reopen the protected dashboard with the cleared session.
6. If a logout warning appears, this device was cleared but server revocation
   was not confirmed; investigate backend/database connectivity. Do not treat
   that warning as successful server revocation.
7. For an existing unverified registration, use **Resume registration
   verification** with its original password. Do not register it again. Wait
   the existing 60-second cooldown between requests of the same OTP purpose.

Registration still returns HTTP 201 when the account was saved but its email
failed, with `otpSent: false` and an explicit message. Login/resend delivery
failure returns HTTP 503. Missing email configuration never becomes a terminal
OTP fallback. Failed delivery does not leave its newly generated OTP active.

## Automated checks and limits

```powershell
npm test -- --silent
node scripts/check-module2.js
npm run build --prefix frontend
```

These automated tests use explicit email doubles; they do not prove Gmail
inbox delivery or your local database persistence. The smoke script also uses
synthetic mail and never sends real Gmail. The `--send-to` command and the manual
application flow above are the separate local delivery checks.
