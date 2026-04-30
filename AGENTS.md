# Agents / AI assistants — working notes for this repo

> Canonical context for Cursor, Claude Code, and any other AI tool working on
> this repo. `.cursorrules` and `CLAUDE.md` are thin pointer files that defer
> to this document so the three stay in sync.

---

## 1. Product

**Pilot-App** — a hiring portal for FedEx pilot candidates ("Pilot History
Portal", rebranded from the internal "FedEx inbound" name). Candidates sign
in, verify identity, fill out a pilot application (flight time, employment
history, residential history, safety questions, certifications), and pass
through a pipeline that books them onto testing / indoctrination class dates.
Admin / HR staff and dev users manage the pipeline, review applications,
import legacy Paradox data, schedule capacity-based sessions, and send
templated emails.

Public domain: `fdxonboard.com`. Support inbox: `support@fdxonboard.com`
(`src/lib/support-contact.ts`).

## 2. Stack

- **Next.js 16** (App Router, React 19, TypeScript 5, Tailwind 3, Radix UI,
  shadcn-style components in `src/components/ui/`). Turbopack in dev
  (`npm run dev` on port 9002).
- **Firebase** (one project, `studio-3449665797-2559e`):
  - **Firestore** — primary data store. Rules in `firestore.rules`.
  - **Auth** — email/password + session cookies. Middleware gates routes.
  - **App Check** — reCAPTCHA Enterprise in prod, debug token in dev.
  - **App Hosting** — `@apphosting/adapter-nextjs` with `apphosting.yaml`.
  - **Cloud Functions (gen2)** — `functions/` HTTP webhook for Resend
    `email.received` → `supportInboundMail` in Firestore.
  - **Trigger Email extension** — writes to the `mail` collection;
    the extension sends via Resend SMTP.
- **Resend** — transactional email (both via the Trigger Email extension
  for candidate-facing templates and via direct `Resend` SDK in
  `src/app/actions.ts` for admin-inbox alerts).
- **Genkit** — scaffolding present (`src/ai/dev.ts`); no production AI
  flows in use after the welcome-email flow was removed in Phase A.

## 3. Directory map (what lives where)

```
functions/                   Firebase Cloud Functions (gen2) — Resend inbound webhook
src/
├── app/                       Next.js App Router
│   ├── page.tsx               marketing / login split
│   ├── help/                  public (unauth) help page
│   ├── privacy/               public privacy policy
│   ├── login/, signup/        auth pages
│   ├── verify/                token + identity verification
│   ├── dashboard/             candidate-facing
│   │   ├── page.tsx           landing + pipeline cards
│   │   ├── application/       pilot history application form
│   │   ├── indoctrination/    class details + "choose class date" CTA
│   │   └── help/              signed-in help page
│   ├── schedule/              capacity-based booking flows
│   │   ├── testing/           cognitive + remote testing
│   │   └── indoctrination/    class date booking
│   ├── admin/                 staff-only, auth-gated by layout.tsx
│   │   ├── page.tsx           admin landing
│   │   ├── review/[uid]/      per-candidate review & pipeline actions
│   │   ├── candidates/        candidate list
│   │   ├── applications/[uid]/ read-only submitted application
│   │   ├── scheduling/        capacity sessions (testing + indoctrination)
│   │   ├── activity/          audit / activity feed
│   │   ├── audit/             audit log table
│   │   ├── emails/            mail collection log
│   │   ├── deletions/         legacy deletion requests queue
│   │   ├── verifications/     identity verification queue
│   │   ├── users/             user management
│   │   ├── import/            Paradox HTML → candidate import
│   │   ├── maintenance/       one-off admin ops (purge legacy data)
│   │   └── devtools/          dev-role only
│   ├── actions.ts             server actions (admin-inbox email triggers)
│   └── admin/actions.ts       Admin-SDK-backed server actions
│   └── admin/legacy-purge-actions.ts  batched delete of retired collections
├── ai/                        Genkit plumbing (unused in prod flows)
├── components/                ui primitives + feature components
├── firebase/                  client-side Firebase setup + hooks (useUser, useDoc, useFirestore)
└── lib/
    ├── types.ts               canonical TypeScript types
    ├── email.ts               Email templates + mail-queue writer (shared header/footer)
    ├── firebase-admin.ts      Admin SDK bootstrap (credential resolution)
    ├── roles.ts               role predicates (admin, dev, staff)
    ├── authorized-admins.ts   pre-authorized staff allowlist
    ├── candidate-pipeline.ts  PIPELINE_STAGES, CandidateFlowStatus mappings
    ├── scheduling-eligibility.ts  which flowStatus unlocks booking UI
    ├── candidate-audit.ts     append-only audit log writer
    ├── support-contact.ts     SUPPORT_EMAIL
    ├── encryption-server.ts   AES for ATP number + medical date at rest
    ├── interview-utils.ts     buildClassIcs + downloadIcs (retained name for import stability)
    └── ...
```

## 4. Firestore collections (short map)

- `users/{uid}` — applicant profile + application. Owners can only mutate
  fields in `userSelfUpdateAffectedKeysAllowlist` (see `firestore.rules`).
- `candidateIds/{candidateId}` — the pipeline record. Owns `flowStatus`,
  `indoctrinationInvitedAt`, `testingInvitedAt`, etc.
- `legacyData/{candidateId}` — imported Paradox data.
- `applicants/{id}` — legacy placeholder, read-only.
- `bridge_codes/{code}` — one-time verification bridges.
- `authorizedAdmins/{email}` — pre-authorized staff (required for staff
  self-signup).
- `pendingVerifications/{...}` — identity verification queue.
- `testingSessions/{id}` + `testingBookings/{id}` — capacity-based testing.
- `indoctrinationSessions/{id}` + `indoctrinationBookings/{id}` —
  capacity-based class dates.
- `interviewSlots/`, `interviewBookings/` — **retired**. Rules blocks
  remain intact for now; data can be purged via `/admin/maintenance`.
- `mail/{id}` — outbound email queue consumed by the Trigger Email
  extension. Written by `sendEmail()` in `src/lib/email.ts`.
- `supportInboundMail/{id}` — inbound support messages (Resend receiving
  webhook → Cloud Function). Admin read only in `firestore.rules`.
- `auditLog/{id}` — append-only activity events. Written via
  `writeCandidateAuditLog` in `src/lib/candidate-audit.ts`.
- `deletionRequests/`, `applicationUnlockRequests/` — candidate-submitted
  portal requests; resolved via `src/app/admin/actions.ts`.

## 5. Environment variables

All vars are documented in [`.env.example`](.env.example) with fail-fast
behavior in production. The short list:

| Var | Where used | Fail-fast? |
|-----|------------|------------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client init | Yes (Firebase SDK) |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` | App Check (prod) | — |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | App Check (dev only) | — |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Admin SDK on server | Yes (via fallback chain) |
| `ENCRYPTION_KEY` | `src/lib/encryption-server.ts` (ATP + medical date at rest) | Implicit |
| `RESEND_API_KEY` | `src/app/actions.ts` admin-inbox alerts; Cloud Function `resendInboundWebhook` (Receiving API) | Yes if `EMAIL_FROM` set (app); Function uses secret |
| `RESEND_WEBHOOK_SECRET` | Cloud Function `resendInboundWebhook` (Svix verify) | Set via `firebase functions:secrets:set` |
| `EMAIL_FROM` | `src/lib/email.ts` `resolveFromAddress()` | **Yes in prod** |
| `EMAIL_REPLY_TO` | `src/lib/email.ts` `resolveReplyToAddress()` | **Yes in prod** |
| `NEXT_PUBLIC_APP_URL` | `getPublicPortalOrigin()` for email links + ICS UID | **Yes in prod** |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `support-contact.ts` (overrides `support@fdxonboard.com`) | — |
| `PORTAL_REQUESTS_ADMIN_EMAIL` | Admin-inbox alerts (`src/app/actions.ts`) | — |
| `VERIFICATION_ADMIN_EMAIL` | Fallback admin inbox | — |

Never commit real values. `.env*` is gitignored (with an explicit
`!.env.example` exception). Service account JSON anywhere in the tree
is gitignored via `**/*service-account*.json` etc.

## 6. Conventions

### Commits
Conventional-style prefixes (`feat:`, `fix:`, `refactor:`, `chore:`,
`security:`, `docs:`). See `git log` for examples.

### TypeScript
- Strict mode. `npm run typecheck` = `tsc --noEmit`.
- Prefer narrow types from `src/lib/types.ts` over ad-hoc shapes.
- `useDoc<T>(ref)` for realtime Firestore reads in client components.

### Server actions
- Always verify caller via `verifyIsAdmin()` / `verifyCallerIsDev()`
  (see `src/lib/firebase-admin.ts`).
- Server actions live either in `src/app/actions.ts` (global),
  `src/app/admin/actions.ts` (admin-gated), or co-located with their
  page as `*-actions.ts`.
- Client components pass `idToken` (from `user.getIdToken()`) rather
  than relying on ambient auth.

### Firestore rules
- Owner updates on `users/{uid}` are key-allowlisted
  (`userSelfUpdateAffectedKeysAllowlist`).
- Admin writes bypass field-level restrictions (`allow update: if isAdmin()`).
- When adding a new field that candidates write, update the allowlist.

### Email templates
- Unified header/footer via `renderEmailShell()` in `src/lib/email.ts`.
- Body links use `${getPublicPortalOrigin()}` — never hardcode domains.
- Mail is queued by writing to Firestore `mail/` collection; the Trigger
  Email extension delivers via Resend.

### Auth gates
- `middleware.ts` is the outer session gate (reads `ff_session` cookie).
- `src/components/auth-gate.tsx` is the inner client gate (handles
  role-based routing).
- Public paths: `/`, `/login`, `/signup`, `/privacy`, `/help`, `/_next`,
  `/favicon`, `/assets`, `/public`, `/api`.

## 7. Scripts

```bash
npm run dev          # next dev --turbopack -p 9002
npm run build        # next build
npm run typecheck    # tsc --noEmit
npm run lint         # ⚠  Next.js 16 removed `next lint`; no ESLint config yet.
                     #   Rely on typecheck + ReadLints in-editor for now.
npm run genkit:dev   # Genkit scaffolding (unused in prod flows)
firebase deploy --only firestore:rules   # ship rules
firebase deploy --only functions       # Resend inbound webhook (user-initiated)
```

Inbound receiving setup (MX + webhook secrets + deploy order): [`docs/resend-inbound-setup.md`](docs/resend-inbound-setup.md).

## 8. Live session state

See [`docs/current_status.md`](docs/current_status.md) for the current
plan status (phase complete, what's deferred, known cleanup items, and
open smoke-test checklist).

## 9. Guardrails for AI tools

- **Never** commit secrets, service account JSON, or `.env.local`.
  `.gitignore` covers these but don't fight it.
- **Never** edit files inside `.cursor/plans/*.plan.md` when executing
  a plan — they are the source of truth, not a working document.
- **Default to reading first.** Firestore rules and pipeline eligibility
  are interdependent; check `firestore.rules` + `src/lib/scheduling-eligibility.ts`
  before introducing a new `flowStatus`.
- Prefer editing existing files over creating new ones. Prefer the
  canonical types in `src/lib/types.ts` over local shapes.
- When a plan specifies specific wording for user-facing copy (emails,
  pages), match it verbatim.
- Deploy steps (`firebase deploy`, `git push`) are user-initiated only —
  never run them without explicit instruction.
