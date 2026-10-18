# Module 2 reliability repair

## Scope and starting point

Repository: `shrutikakadu/anonymous-verifiable-voting-system`.
Only authorized branch: `feature/member2-auth-complete`.
Starting commit: `027715ace0c7e7a37de146837e4d48c0860f7b75`.
It already contains main through `471e652027eb6a9572b8d807b3bd82216c1fbeca`.
The checkout was clean and was fetched/checked before editing. No main or
teammate branch was merged, reset, rebased, modified or pushed.

Publication was attempted through the connected GitHub integration. Creating
the repair tree was rejected with HTTP 403, `Resource not accessible by
integration`. No remote commit or branch-ref write succeeded and no alternate
write route was attempted. The tested local commit is preserved in the delivery
bundle/patch; its exact SHA is in the completion message and package README.

This report supersedes the delivery-behavior discussion in the earlier
`auth-repair-report.md`, which describes the previous implementation.

## Confirmed problems and repairs

1. Missing local `.env`/sender credentials caused the old development-only
   logging fallback. The service returned normally, allowing registration and
   login to claim email success without any SMTP connection. It now fails
   explicitly in every environment, never prints OTP values, and rejects blank
   and original-template sender placeholders. No private credentials were
   supplied or committed.
2. A resolved SMTP call was treated as success without checking whether the
   intended recipient was accepted. It now checks the accepted-recipient list,
   has bounded connection/greeting/socket timeouts, and invalidates the newly
   saved challenge if sending fails. Conditional cleanup cannot erase a newer
   challenge. Existing resend cooldowns are retained.
3. OTP verification used an ordinary read/compare/save sequence. Against the
   original `027715a` controller, two concurrent requests using independent
   Mongoose document snapshots both returned HTTP 200 and both issued JWTs.
   The repaired document saves include the expected challenge hash, purpose,
   attempt count and expiry in Mongoose's atomic update filter. Exactly one
   concurrent verification succeeds; stale verification cannot consume a
   replacement code. Expiry is checked again at persistence time. Concurrent
   OTP generation also uses a conditional save to preserve cooldown enforcement.
   This uses Mongoose's document `$where` filter extension, not executable
   MongoDB JavaScript and not a schema migration.
4. Same-user JWTs signed during the same second could otherwise be identical;
   revoking one could unintentionally revoke another. Voter login JWTs now have
   a random `jti`, while preserving existing claims and the two-hour expiry.
   Production Module 2 login rejects the known default/template signing secret.
5. Non-string password input could reach bcrypt and produce a server error.
   Login/resend now reject it with HTTP 400. Missing/non-string stored hashes
   produce the generic credential rejection rather than a bcrypt type error.
6. Frontend logout silently swallowed server failure. It still clears this
   device, but now shows an explicit warning when server revocation was not
   confirmed; an already expired/revoked JWT needs no such warning. Pending OTP
   state is cleared on logout. Existing voting-credential/receipt behavior is
   preserved.
7. Registration's delivery error was reduced to a generic frontend notice, and
   login OTP handling deleted pending state before checking for a returned JWT.
   The OTP screen now retains the backend delivery explanation and clears login
   pending state only after a valid session response is processed.

## Files changed and why

| File | Module 2 purpose |
|---|---|
| `.env.example` | Root-file instructions and intentionally blank Gmail fields; all other settings preserved. |
| `backend/services/otpService.js` | Explicit config failure, Gmail acceptance checks/timeouts, conditional creation and failed-send cleanup. |
| `backend/utils/saveOTPState.js` | Auth-only conditional document save; stale updates fail closed. |
| `backend/controllers/authController.js` | Accurate delivery errors, typed passwords, conditional OTP consumption/attempts, unique JWTs and production signing guard. |
| `frontend/src/pages/voter/Register.jsx` | Pass the saved-but-unsent explanation to the existing OTP screen. |
| `frontend/src/pages/voter/OTPVerification.jsx` | Show that explanation and preserve pending login until a JWT response is processed. |
| `frontend/src/context/AuthContext.jsx` | Honest logout failure warning and pending-OTP cleanup; no voting-flow redesign. |
| `frontend/src/pages/voter/Login.jsx` | Display the logout warning. |
| `scripts/check-module2.js` | Explicit synthetic mail transport instead of relying on terminal OTP logging. |
| `scripts/check-auth-email.js` | Safe local presence checks and opt-in real SMTP send; no secret/OTP output. |
| `tests/integration/authRecovery.test.js` | Delivery failures/configuration, typed input, full session/revocation flow, distinct same-second JWTs. |
| `tests/integration/authAtomic.test.js` | Real Mongoose conditional update filters with isolated collection I/O, concurrent consumption/resend, stale challenges and expiry. |
| `docs/module2-email-setup.md` | Exact Windows setup and real inbox verification steps. |
| `docs/module2-reliability-report.md` | This evidence/scope record. |

No dependencies or lockfiles were upgraded. No shared DB loader, voter schema,
JWT middleware, admin, voting/token, cryptographic, tally, dashboard, theme or
shared routing source was changed. Existing non-Module-2 tests remain unchanged.
No `.env`, credentials, generated key material, real voter data, live OTPs or
tokens are included. Automated-test credentials are explicitly synthetic.

## Verification and limitations

- Baseline: 204 tests passed in 18 suites.
- Repaired automated checks: 218 tests passed in 19 suites, including all
  existing non-authentication suites and four conditional-save concurrency
  checks. An initial test-fixture error was corrected before final verification;
  production code was not weakened to satisfy it.
- Existing Module 2 smoke script: 12 checks passed using a synthetic mail sender.
- Eleven temporary jsdom UI flow checks passed against the actual React app and
  Express API with repository/mail doubles. These cover fresh registration,
  duplicate/recovery/wrong credentials, cooldown/resend and registration OTP,
  password plus login OTP through the AuthContext and protected dashboard,
  verified-account recovery guidance, successful logout/revoked-token rejection,
  failed logout warning, missing-email setup reporting, restoration of a stored
  valid session, rejection of a stored expired session, and a missing-JWT response
  that retains pending verification without creating a session.
- SMTP rejection and thrown transport failures are tested separately from
  provider acceptance. Provider acceptance is never described as verified inbox
  delivery.
- `node scripts/check-auth-email.js --check` with no private environment printed
  false presence flags and exited 1 with `OTP_EMAIL_NOT_CONFIGURED`, as intended.
- Final frontend production build passed (133 modules). `git diff --check` and
  syntax checks passed. `npm run lint` completed but only prints that no linter
  is configured; it is not a substantive lint check. The final commit/publishing
  status is recorded in the completion message and any delivery package.
- Real Gmail delivery was NOT verified: no private credentials or inbox/computer
  access were available. Follow `module2-email-setup.md` locally.
- Real MongoDB was unavailable in this managed environment: downloaded temporary
  MongoDB binaries exited with `open: Operation not permitted`. Tests exercise
  real Mongoose save/update-filter construction and synthetic atomic collection
  I/O, not a live database or persistence across real restarts. Shared fallback
  behavior was deliberately left untouched.
- Native Chromium installation previously failed with invalid downloaded
  archives. Frontend flow checks use jsdom and do not verify native-browser
  layout or every browser-specific behavior.
- Passing these scoped checks is not a claim of an exhaustive security audit.
  A persistent database, strong private signing secret and real configured Gmail
  sender remain necessary for a reliable local end-to-end run.
