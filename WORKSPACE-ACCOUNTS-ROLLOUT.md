# Radar workspace accounts — production receipt

Deployed September 21, 2026. Application source commit:
`0f27d1baf2aee0a933d9171973b00b2bcf33d18c`.

- Railway SUCCESS deployment: `ba077dc6-4adf-4f16-b94f-2fffb56542c0`, submitted
  at 18:45:32 UTC; read-only verification passed at 18:47:34 UTC.
- Both Radar custom domain and the existing Railway hostname use that service.
- Initial account deployment: `c964ceda-4914-4d52-a9f7-07fa79d14f3c` from
  `d1b38a5d74adabbbefec93dc742218276a251926`.
- Pre-feature deployment/source: `f4cd570a-e838-418a-88de-e1e0a68c4044` /
  `e35294d6916fc070b091d4ce88d36e3f6200eb88`.
- [Draft pull request](https://github.com/Ramthh/Carflex_app/pull/1), targeting
  the deployed source branch. It remains unmerged.

The private `RADAR_WEBSITE_LEADS_SERVICE_TOKEN` was provisioned via stdin with
automatic redeployment skipped, then verified by equality without printing it.
The guarded additive migration created only `WorkspaceIdentity` and its negative
ID sequence. No existing User or business rows were modified by that migration.
Before rollout, the fixed central Radar session probe returned JSON 401 for an
invalid token after central release `20260921-workspace-accounts-41397c58bd`.
Both Radar deployments passed the clean-commit/current-deployment guard.

Production's actual Website Leads loader and revalidation both read the fixed
list endpoint. The final service exception therefore allows **GET /api/offers
only**. Numeric and UUID detail routes require ordinary authenticated app
access; the service token does not grant it.

All 11 final live checks passed:

| Request | Result |
| --- | --- |
| Login page | 200; username or email field present |
| Static logo | 200 |
| Anonymous listings API | 401 |
| Anonymous Website Leads list | 401 |
| Anonymous Finder API | 401 |
| Anonymous dashboard | 307 to login |
| Anonymous NextAuth session | 200 with no user |
| Server-token Website Leads list | 200; 409 rows counted, no payload exported |
| Server-token numeric detail | 401 |
| Server-token UUID detail | 401 |
| Anonymous offers on Railway hostname | 401 |

No user account, CRM record or email was created or changed during rollout
verification. Managed login/revocation and legacy session compatibility were
verified using fixtures: 71 total tests, including 20 workspace tests, passed.
TypeScript and the production webpack build passed, with the Node proxy
registered in the built functions configuration. A local HTTP-server start was
blocked by automatic tool policy before execution, with no specific reason;
no workaround was attempted. The live HTTP checks above were performed only
after the authorized Railway deployments succeeded.

The exact deployed source archive contains 210 files, 5,083,867 bytes:
`radar-workspace-accounts-source-0f27d1b.zip`.
SHA256: `5b89789f766eb0b013235c973c22fb057fdef61a2861e108332326946e1a4b0b`.
The Windows handoff directory is
`D:\Codex\Carflex-Radar-Workspace-Accounts-Release-20260921`; it contains the
source audit and status/count-only live verification JSON. No environment,
private-key or cache files are in the source archive. Earlier release evidence
and source archives remain preserved.

This receipt is documentation only; the deployed application code is the source
commit above. For future changes use the current successful Railway deployment
as a reviewed guard baseline and retain the additive identity schema on code
rollback. See `WORKSPACE-ACCOUNTS.md` for the fixed target and recovery limits.
