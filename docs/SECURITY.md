# Security notes — Pilot App (Firebase)

This document tracks Firebase and app security posture. Update it when rules, auth flows, or threat assumptions change.

**Last rules check (via Firebase MCP):** Deployed Firestore and Storage rules matched repo files `firestore.rules` and `storage.rules` for project `studio-3449665797-2559e`.

---

## Current posture (summary)

| Area | Status |
|------|--------|
| **Storage** | All paths deny read/write (default-safe). |
| **Users** | Owners cannot change privilege, verification, identity, or legacy mirror fields on update (`isAdmin`, `role`, `status`, `verifiedAt`, `candidateId`, `legacyData`, etc.); those writes use **Admin SDK** server actions (`src/app/applicant/verification-actions.ts`). Admins retain full read/write. |
| **Audit log** | Client creates constrained; no client update/delete. |
| **Mail** | No client access. |

---

## Findings (prioritized)

### P1 — Over-broad document reads (authenticated IDOR) — **mitigated in rules**

`get` is now scoped as follows (see `firestore.rules`):

| Collection | Behavior |
|------------|----------|
| `candidateIds` | Admin; **or** `assignedUid == auth.uid`; **or** unclaimed row where **email** matches auth email (case-insensitive) **or** valid **masterKey** + optional `masterKeyEmails` / expiry. |
| `legacyData` | Admin; **or** signed-in user whose **`users/{uid}.candidateId`** equals the document id. |
| `applicants` | Admin; **or** doc **email** matches auth email (case-insensitive). |
| `bridge_codes` | Admin; **or** unclaimed docs only (`isClaimed` not true) for signed-in users (still needs the secret code id to call `update`). |

**Ops note:** `masterKeyEmails` entries should be stored **lowercase** so `hasAny([request.auth.token.email.lower()])` matches.

### P2 — Interview slots global read — **mitigated**

`interviewSlots`: non-admins may **read** only documents with **`status == 'available'`** (matches the schedule page query). Admins retain full read for the interview admin UI.

### P3 — `interviewBookings` create shape — **mitigated**

Create now uses **`keys().hasOnly([...])`** for the fixed field set (no extra client fields).

### P4 — Bootstrap admin

`fedexadmin@fedex.com` may create a user doc with `isAdmin` + `role: admin` on signup.

**Risk:** Control of that email controls bootstrap admin.

**Direction:** Lock the account in Firebase Auth; consider one-time bootstrap then remove path; consider custom claims for admin.

---

## App-layer (non-rules) checklist

- [ ] Middleware session cookie (`ff_session`): `HttpOnly`, `Secure`, `SameSite` appropriate for production.
- [ ] All server actions / Admin SDK entry points verify **admin** (not only client UI).
- [ ] No secrets in client bundles; `.env.local` not committed (covered by `.env*` in `.gitignore`).

---

## Local Admin setup (Firebase service account)

Server-side code initializes the Admin SDK in `src/lib/firebase-admin.ts`, in this order:

1. **`FIREBASE_SERVICE_ACCOUNT_JSON`** — entire service account JSON as one minified string (no newlines). Use in `.env.local` locally or as a **secret** env var on your host.
2. Else **`scripts/service-account.json`** or **`scripts/service_account.json`** — gitignored; download from Firebase Console → Project settings → Service accounts → **Generate new private key**.
3. Else `initializeApp()` with no credential (typically fails outside Google Cloud).

**Local development:** Prefer a **development** Firebase project and its key. Never commit the JSON.

**Production:** In Vercel/Railway/etc., add secret **`FIREBASE_SERVICE_ACCOUNT_JSON`** with the production project’s minified JSON. Use **`NEXT_PUBLIC_*`** values for the **same** production project unless you intentionally split environments.

**Environment separation:** Use separate Firebase projects (and separate keys) for dev vs prod to limit blast radius if a key leaks.

### Regression checks (Admin-backed flows)

After credentials are configured, smoke-test as a signed-in applicant and watch server logs for Admin init / permission errors:

| Flow | Where | Expected |
|------|--------|----------|
| Applicant token verify | `/verify/token` | User `status` / `verifiedAt` updated via `completeApplicantTokenVerification`; redirect to dashboard. |
| Candidate ID verification | Dashboard verify UI | `completeCandidateIdVerification` updates `candidateIds` + `users`; legacy copied if present. |
| Legacy sync | Dashboard or `/dashboard/application` when eligible | `syncLegacyDataForUser` writes `legacyData` when verified and mirror missing. |
| Application opened | First open `/dashboard/application` when verified | `markApplicationFlowOpened` sets candidate `applicationStartedAt` and user `candidateFlowStatus: in_progress` once. |

---

## Scenario log (prompt here)

Use this section when testing “what if” cases. Add a row or bullet per scenario after you discuss it with the team or AI.

| Date | Scenario | Outcome / decision |
|------|-----------|-------------------|
| 2026-03-24 | Tighten Firestore `get`/`read` for candidateIds, legacyData, applicants, bridge_codes; interviewSlots; interviewBookings `hasOnly` | Deployed to `studio-3449665797-2559e` |
| 2026-03-24 | Privilege / verification escalation on `users/{uid}`: deny owner updates to verification & identity fields; token + candidate-ID verify + legacy sync + application-opened pipeline via server actions | Redeploy `firestore.rules` after pull |
| 2026-03-24 | Ops: `.gitignore` cleaned (UTF-8); Admin credential docs in `env.local.example` + SECURITY; dev vs prod keys; regression matrix for verification server actions | `npm run build` OK; run manual smoke tests per SECURITY |
| | *Example: User A guesses candidateId B and calls getDoc* | |

**Prompt template for follow-ups:**

> Scenario: [actor] [action] on [resource]. Auth: [signed out / user / admin]. Expected: [allow/deny]. Check: rules + client + server actions.

---

## References

- [`docs/verify-firestore-enforcement.md`](docs/verify-firestore-enforcement.md) — How to verify client vs server Firestore enforcement (static script, Rules Playground, smoke tests); aligns with the Cursor plan *Client vs server Firestore writes* under `.cursor/plans/`.
- `firestore.rules` — Firestore security rules.
- `storage.rules` — Storage security rules.
- `middleware.ts` — Route/session gate for non-public paths.
- Firebase MCP: `firebase_get_security_rules`, `firebase_update_environment` (project dir + active project).
