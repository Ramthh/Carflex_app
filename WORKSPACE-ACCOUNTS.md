# Radar workspace accounts

The final production deployment and verification receipt is recorded in
[WORKSPACE-ACCOUNTS-ROLLOUT.md](WORKSPACE-ACCOUNTS-ROLLOUT.md).

## Baseline and deployment target

This isolated checkout starts at `e35294d6916fc070b091d4ce88d36e3f6200eb88`
(`codex/finder-search-dealers-20260919` in `Ramthh/Carflex_app`). The prior
September 19 release notes tie that commit to Railway SUCCESS deployment
`f4cd570a-e838-418a-88de-e1e0a68c4044` at 17:42 UTC. Fresh Railway deployment
and domain reads confirmed it is the live baseline on September 21. Runtime
source hashes could not be compared because the account has no registered
Railway SSH key; no key or hosting setting was changed.

Both `https://radar.carflexplus.ca` and
`https://carflexapp-production.up.railway.app` use the same service:

- Project: `814367f9-3a40-4e77-85e9-0446ca34230e` (Carflex).
- Environment: `b9db5ab4-246c-4ed9-be6a-fb977282aa43` (production).
- Service: `04a5d29b-4c89-4365-9f58-0ef8de0b0c9d` (Carflex_app), port 8080.
- Build: `npm ci`, `npm run build -- --webpack`; start: `npm start`.
- Deploy: Railway CLI source upload. Pushing a feature branch does not deploy it.

## Identity and access

The login accepts a username or a legacy email address. Usernames are 3–64
letters, digits, dots, underscores or hyphens, with no `@`. They authenticate
only against fixed HTTPS `https://finder.carflexplus.ca/api/workspace-auth`:

- `POST /login` with `{username,password,workspace:"radar"}`.
- `POST /session` with `{token,workspace:"radar"}` on every protected request.
- `POST /logout` with the same token and audience when signing out.

Login/session responses must include the `radar` audience, future epoch-ms
`expiresAt`, and a stable UUID `user.id`, username and name. Login must return a
64-lowercase-hex bearer. Redirects, invalid replies, outages and removed grants
fail closed. No successful authorization is cached. Quiet live streams repeat
authorization every five seconds; client session refresh runs every 15 seconds
and on window focus, removing the rendered workspace when access ends. New
requests are denied immediately after central revocation; already delivered
data cannot be withdrawn from a client.

Central passwords pass unchanged with the authority's 12–300 JavaScript
character / maximum 1,200 UTF-8 byte bounds. Legacy email sign-in retains its
existing password behavior. Replies require JSON, are capped at 16 KB, and
have an eight-second deadline covering both the connection and body read.

NextAuth keeps the bearer solely in its encrypted HttpOnly, SameSite=Lax,
host-only cookie. Neither it nor the central subject is returned by the client
session endpoint. Existing email/bcrypt accounts retain their numeric IDs and
roles; central denial never falls back to a legacy login. Mapped users cannot
authenticate through a legacy email/password path.

`WorkspaceIdentity(subject UUID PRIMARY KEY, user_id INTEGER UNIQUE)` maps a
central subject to a stable ordinary local user. The additive migration creates
only that table and a descending negative-ID sequence. A transaction plus a
per-subject advisory lock serializes first login; occupied IDs are skipped
without overwriting any row. Synthetic emails use the central UUID at
`workspace.invalid`, and the password is an unusable `!` sentinel. Existing
users are never automatically matched by email, username or display name.
New rows always receive the existing `OTHER` role, without OWNER/ADMIN powers.
Their scope is the existing inventory and VIN screens plus read-only listing
APIs. Direct owner, employee, sheet and CRM requests are denied. Negative IDs
are compatible with the existing nonzero numeric session checks and the
per-user saved-filter key; employee actions are outside this account scope.
Initial listing reads dispatch to fixed local handlers only after session
validation, avoiding an unauthenticated HTTP loop or forwarded credentials.
Managed users receive existing-source changes by authenticated polling;
Finder keeps its authenticated event stream. Managed sessions do not open
legacy direct Supabase subscriptions. Shared edit/send controls are hidden for
those sessions, while copying a listing stays local and does not write CRM data.

## Website Leads compatibility

All business APIs require an authenticated, currently valid session, including
ones that previously had no guard. Public exceptions are the existing auth
routes, login/password-recovery screens and exact static assets. There is no
customer lead-submission endpoint in this repository.

Production's server-side lead adapter may use only `GET /api/offers` with
`Authorization: Bearer <token>`. Its actual load and revalidation contract both
use this fixed list endpoint. Individual UUID/numeric detail URLs receive no
service-token exception; signed-in legacy users retain their ordinary access.
The 64-hex secret in Radar's `RADAR_WEBSITE_LEADS_SERVICE_TOKEN` must match
Production's `CARFLEX_WEBSITE_LEADS_TOKEN`. The comparison is timing-safe;
other paths/methods, query tokens and cookies confer no service access.
Provision both server secrets privately before rollout. Do not put the secret
in client configuration, Git, deployment messages or browser requests.

## Guarded release and rollback

The release helper defaults to a read-only plan, validates a clean reviewed
commit and checks that Railway's newest deployment is the expected SUCCESS.
It reads existing Railway variables into process memory only. Set
`CARFLEX_RAILWAY_CLI` to the authenticated CLI executable if it is not on PATH.
On this PC the verified CLI was located at
`C:\Users\ramth\AppData\Local\npm-cache\_npx\79fa66f96c8fdacf\node_modules\@railway\cli\bin\railway.exe`.

The helper repeats schema-only ID/role compatibility checks; live preflight
found an integer User ID, no positive-ID check constraint, the OTHER role, and
no existing mapping table or sequence. `.railwayignore` explicitly excludes
environment files, private keys, local build/dependency caches and operational
tests/scripts/migrations from the upload. Git tracks no environment files.

Use the final reviewed commit for `COMMIT` and re-read the baseline if another
deployment has appeared; do not blindly update the expected ID after drift.

```text
node scripts/workspace-accounts-release.mjs plan --expected-commit COMMIT --expected-deployment f4cd570a-e838-418a-88de-e1e0a68c4044
node scripts/workspace-accounts-release.mjs migrate --apply --expected-commit COMMIT --expected-deployment f4cd570a-e838-418a-88de-e1e0a68c4044
node scripts/workspace-accounts-release.mjs deploy --apply --expected-commit COMMIT --expected-deployment f4cd570a-e838-418a-88de-e1e0a68c4044
```

Order: review code and tests, provision both service credentials, apply the
additive SQL migration, then deploy the exact reviewed source. The helper
refuses deployment before the mapping schema and Radar service credential
exist. After submission, wait for Railway SUCCESS and inspect anonymous login,
unauthenticated business-API denial, public auth/static access, and authorized
fixtures without modifying live CRM records or sending email.

For application rollback, redeploy the preserved baseline source and retain
the additive table/sequence and mapped rows. Never delete shadow users or
business history. **The old application has unauthenticated business APIs**, so
prefer a corrected forward deployment; a rollback reintroduces that old access
behavior. The optional `rollback-empty-migration --apply` operation refuses
when any mapped identity exists and is intended only for an unused install.

## Verification

`node --test tests/*.test.mjs`: 71 passed, including 20 focused workspace tests
covering central audience/identity/expiry checks, revocation, auth outages,
legacy separation, cookie-to-session projection, narrow service authorization,
actual proxy behavior, and transactional stable-ID mapping/collision recovery.
They include real NextAuth encrypted-cookie encode/decode, negative-ID saved
preferences, authenticated server listing dispatch and Unicode credentials.
`npx tsc --noEmit` passed. The production webpack build passed with all routes
and the Next.js proxy included. Build used only an inert Resend placeholder
required by the existing module initializer; no live database or mail service
was contacted by the build. No account, schema, environment or deployment was
changed during implementation or fixture tests.
The built `.next/server/functions-config-manifest.json` registers
`/_middleware` with the `nodejs` runtime and the intended global matcher;
`.next/server/middleware.js` exists. Next.js stores Node proxy registration
there, while its separate Edge middleware manifest is empty as expected.

A full local HTTP smoke attempt (`npm start` on port 4315 with synthetic
configuration) was rejected before process creation by automatic tool policy,
which supplied only “blocked by policy.” The proxy tests invoke the real
exported proxy with NextRequest fixtures and mocked authorization dependencies;
they do not replace a full runtime HTTP check. Complete that check before
publishing. No retry routed around the policy block.
