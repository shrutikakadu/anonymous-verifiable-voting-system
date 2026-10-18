# Authentication investigation and scoped repair

## Result

Added a password-protected way to resume an incomplete registration from the
registration and login screens. It uses the existing backend recovery endpoint;
it does not create another account or replace its password. Verified users have
a login link. Existing OTP cooldowns, attempt limits, hashing, purposes and JWT
requirements are preserved.

The reported invalid-password incident could not be reproduced with equivalent
synthetic credentials in the current code. No backend credential-checking change
is justified by the available evidence. Actual inbox delivery and the user's
Windows database/environment remain unverified.

## Git status and scope

- Repository: `shrutikakadu/anonymous-verifiable-voting-system`.
- Authorized branch: `feature/member2-auth-complete`.
- Original remote branch SHA: `945f1578380562657c2a3361e7e8bcbc3f593cc7`.
- Synchronized upstream SHA: `471e652027eb6a9572b8d807b3bd82216c1fbeca`.
- Fresh clone had no user changes or unpublished local commits.
- Fetch and comparison confirmed main was 20 commits ahead, zero behind, and the
  merge base was the original branch SHA. Only the authorized checkout was
  fast-forwarded; no rebase, reset, force-push or whole-merge revert was used.
- GitHub rejected creation of the repair tree with HTTP 403, `Resource not
  accessible by integration`. No commit or branch-ref write succeeded. No
  alternate write route was attempted. The completion message records the
  local repair commit SHA; it is not a published GitHub commit.
- The authorized remote branch remains at its original SHA. Its upstream
  synchronization and repair are preserved locally, with a commit patch and
  portable Git bundle. Main and all other remote branch heads remain unchanged.
- All teammate changes are inherited through that fast-forward. The repair diff
  is limited to the four files listed below. No shared database, auth controller,
  schema, middleware, routing, voting, token, cryptography, admin, dashboard or
  theme source changes are included.

## Root causes: confirmed versus unresolved

| Observation | Finding | Confidence / limitation |
|---|---|---|
| OTP appears in terminal but no email arrives | `sendOTP` deliberately logs the code and returns without sending mail when either `OTP_EMAIL` or `OTP_EMAIL_PASSWORD` is absent outside production. Production throws instead. | Confirmed source behavior and tested with a suppressed logger. Consistent with the reported terminal fallback; no access to the user's actual environment or inbox. |
| Invalid voter ID or password after registration OTP | This response occurs when normalized voter ID lookup returns no record or bcrypt rejects the supplied password. Synthetic registration, verification and login work. Registration and login use the same model/connection and ID normalization. `+passwordHash` is explicitly selected. | The user's specific failed login remains unresolved. Missing record after a fallback restart, a different backend/database, or different credentials remain possible; none is established for that incident. |
| Duplicate registration | Both voter ID and email are unique. The controller rejects an existing match on either field; an unverified account remains registered, including after email delivery failure. | Confirmed and reproduced for duplicate ID, duplicate email and failed delivery. The exact conflicting field in the user's account is unknown. |
| Cannot resume an incomplete account after losing the OTP screen/session | Registration UI only attempted account creation. The recovery endpoint existed, but its UI was reachable only from an existing pending registration OTP screen. | Confirmed UI gap. Repaired by exposing the existing credential-protected recovery flow directly. |
| MongoDB refuses localhost connections | The supplied logs show no server accepting the attempted loopback connections. `db.js` then creates a new temporary MongoDB instance. Such replacement instances do not retain the previous temporary database. | Source and supplied logs support a persistence risk. Cannot inspect MongoDB installation/service state or MONGO_URI on the user's Windows machine. Actual restart data-loss reproduction was blocked here. |
| Frontend/backend mismatch | Current auth API calls use one `voterApi` instance, default `/api`, with Vite proxying to port 5000. Payload fields and purposes match the backend. | DOM integration checks pass with the current AuthContext and dashboard. A deployed `VITE_API_URL` override could target another backend; no deployment configuration was provided. |

## History and attribution

Dates below use the recorded commit-author dates in Asia/Kolkata. Authorship is
Git metadata, not proof of responsibility for an incident. No later teammate
commit was shown to cause the reported password failure.

| Commit / author / date | Message and relevant files | Changed behavior | Regression evidence |
|---|---|---|---|
| [`423309b`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/423309b9943995f68901d6028d1eb26201dedf1c), shrutikakadu, 2026-10-02 | Initial commit; original auth controller, OTP service and DB connection | Original authentication baseline. | Historical baseline only; not treated as a verified working production version. |
| [`804086d`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/804086dde690af91f775fa9f31f1bd7c6b72edd8), Arya Akhade, 2026-10-07 | feat(part4): Complete Token Verification and Double Vote Prevention logic, tests, and API; `backend/config/db.js`, `backend/services/otpService.js` | Added temporary MongoDB fallback and missing-email-credential development OTP logging. | Explains temporary-data and terminal-only delivery behavior. Predates Module 2 completion; not evidence that a later merge broke login. |
| [`e82a0ac`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/e82a0ac375477cdd7a121a6efa0a453fa1ecd4cd), SamikshaDavare, 2026-10-11 | Implemented voter registration and database integration; auth controller, Voter schema, DB diagnostics | Consistent ID normalization, hidden passwordHash with explicit login selection, duplicate-key handling, saved-registration delivery warning. | Password retrieval was updated together with hiding the hash. No password-check regression reproduced. Included via PR #3. |
| [`22ea2d6`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/22ea2d6), shrutikakadu, 2026-10-11 | fix(db): remove process.exit crash when mongodb-memory-server unavailable, add graceful fallback; `backend/config/db.js` | Connection timeout and graceful startup when neither database is available; retained temporary fallback and added data-loss warning. | Can allow the server to start without a usable DB. Does not explain a confirmed bcrypt mismatch. No shared DB repair made. |
| [`bc59c14`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/bc59c14b136e735dcd72c57eb0195e24173f2334), Rewan Kadam, 2026-10-11 | Implement Module 2 login OTP JWT and session security; auth controller, Voter schema, auth routes, OTP service/generator and auth frontend | Separate registration and login OTPs, bcrypt OTP hashes, expiry, attempt limits, cooldowns, email verification, JWT after login OTP, revocation and credential-protected registration resend. | Intentional security contract change. Generic credential error belongs to this commit. Recovery UI was limited to pending OTP sessions. No successful password login regression reproduced. Included via PR #4. |
| [`945f157`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/945f1578380562657c2a3361e7e8bcbc3f593cc7), Rewan Kadam, 2026-10-11 | Merge latest main into Module 2 branch | Integrated team work into the original authorized branch. | Diff against first parent does not alter the auth controller, OTP service or Voter model. |
| [`4dd5a23`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/4dd5a234a5b2140b1c8ed13955be293ab6ffe40d), komcy, 2026-10-12 | feat(frontend): voter session, protected routes, signed-token vote flow, receipt verification; authService, AuthContext, OTPVerification, voterApi and session utilities | Auth requests moved from direct axios to shared voterApi; OTP success now calls AuthContext.login and stores the session in sessionStorage. | Payload fields and endpoint contracts remain compatible. Current DOM checks establish the session and load the protected dashboard. VITE_API_URL adds an environment-dependent backend override. |
| [`64503d9`](https://github.com/shrutikakadu/anonymous-verifiable-voting-system/commit/64503d964b1b65dbd26f57bc5f8b7fff305d9afc), komcy, 2026-10-14 | feat(frontend): shared UI kit, redesigned dashboard/token/ballot, restore member-owned pages; OTPVerification and AuthContext among other frontend files | Restored member-owned OTP page behavior while retaining AuthContext login integration. | Does not change password submission or backend hashing. No evidence of the reported invalid-credentials regression. |

PR #4 (`aee3808`) merged Module 2. PR #5 (`fdbeda1`) merged the voter-flow
changes, including the later frontend integration. Their metadata and commit
diffs were inspected. Neither merge changes backend auth files after Module 2.
The historical `feature/member2-auth` and `member2` branches are absent from the
current remote branch list, so branch-specific unpublished history is unavailable.

`git diff 945f157 471e652` is empty for the auth controller, Voter model, OTP
service/generator, auth routes, DB config, registration page and login page.
The backend files are also unchanged between `bc59c14` and the original branch
tip. Current smoke tests therefore exercise identical backend source for those
revisions, although historical live databases/configurations cannot be recreated.

## Repairs and file review

| File | Purpose |
|---|---|
| `frontend/src/pages/voter/Register.jsx` | Offer new-registration and resume-verification modes. Recovery submits only voter ID and password to the existing endpoint, stores only normalized voter ID/purpose after success, then opens the existing OTP screen. No name/email requirement for resuming, and no new-account request during recovery. Adds login guidance and clears the entered password on mode switch/success. |
| `frontend/src/pages/voter/Login.jsx` | Link to registration recovery without changing password-login behavior. |
| `tests/integration/authRecovery.test.js` | 18 focused route/service/schema checks using actual bcrypt, JWT, Mongoose documents and OTP generation with isolated repository and mail doubles. |
| `docs/auth-repair-report.md` | Investigation, attribution, scope, configuration and verification record. |

No API response, endpoint, unique index, password, account, persistent database,
or security protection was changed. Backend tests generated an incidental tracked
public-key change; it was restored to the upstream content before final review.
No generated keys, actual voter data, live OTPs, tokens or SMTP secrets are part
of the repair diff. Test credentials and example addresses are synthetic.

## Verification

- Before repair: all **186 existing Jest tests in 17 suites passed**.
- Existing `node scripts/check-module2.js`: **12 smoke checks passed**, covering
  registration, purpose separation, verification, login OTP, JWT, protected API,
  fake JWT rejection, logout and token revocation.
- Final `npm test -- --silent`: **204 tests passed in 18 suites**, no final test
  failures. This includes voting/admin/security/integration suites unchanged.
- New checks cover: normalized registration, password and OTP hashing, expiry,
  selected password hash, valid registration and login OTP, JWT timing/claims,
  wrong password/unknown ID, unverified login, duplicate ID/email/index error,
  credential-protected recovery, verified-account protection, cooldowns,
  purpose separation, five-attempt limit, sequential OTP replay, email failure,
  production fail-closed behavior and schema uniqueness/hidden hashes.
- Five additional DOM flow checks passed against the actual React application,
  Express auth endpoints, AuthContext and protected dashboard with repository and
  email doubles: new registration; duplicate/wrong-password recovery; cooldown,
  resend and registration verification; password plus OTP login; login recovery
  link and already-verified guidance. Passwords were absent from browser storage.
  These were temporary jsdom QA checks, not added package dependencies.
- `npm run build --prefix frontend`: passed, 133 modules transformed.
- `npm run lint`: completed, but the repository command only says that no linter
  is configured; this is not a substantive lint result.
- `git diff --check`: passed. Intended files were individually reviewed.
- Native browser check could not run: Chromium download returned invalid archives.
  DOM checks do not verify visual layout or native browser-specific behavior.
- Real MongoDB testing/restart reproduction could not run: temporary MongoDB
  8.2.6 and 7.0.24 both exited with code 100; diagnostic output reports
  `open: Operation not permitted`. Existing test suites and new route tests use
  database doubles, so they do not prove real persistence or actual MongoDB
  projection/index enforcement. No shared DB changes were made to work around it.
- Real Gmail delivery was not attempted: no sender credentials or inbox access
  were provided. Transport success/failure handling was tested with doubles.

## Required environment follow-up

The backend explicitly loads the repository-root `.env` in `backend/server.js`.
It does not explicitly load `backend/.env`. Configure the root environment with
`MONGO_URI` pointing to the intended running persistent MongoDB instance, and
`OTP_EMAIL` / `OTP_EMAIL_PASSWORD` for the Gmail transport configured in the
service. Keep actual values out of Git. A frontend `VITE_API_URL` override must
point to the intended backend API base, including `/api`; the default local
development path already uses Vite's proxy.

Check the startup message for the intended persistent MongoDB connection. A
temporary fallback message means registration data can disappear after server
restart; a complete database failure means DB-backed auth cannot work even if
the health endpoint responds. This investigation cannot establish why MongoDB
is not listening on the user's machine or whether its URI/service is correct.

Use **Resume registration verification** with the original credentials for an
unverified existing account. Use **Log in** for a verified account. Recovery
does not reset a forgotten password. If login still rejects those credentials,
the remaining diagnostic is whether that same voter record and bcrypt hash
exist in the exact persistent database used by that backend, without exposing
the hash or credentials. No account deletion, migration or password replacement
has been performed.
