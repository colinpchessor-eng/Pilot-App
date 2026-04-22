# Current status — Pilot-App

> Living doc. Update this whenever a plan completes a phase, a decision
> lands, or something is explicitly deferred. Keep it short; point at
> the canonical plan or code for the long version.

_Last updated: 2026-04-22 (before first cross-machine push)._

---

## 1. Where we are in the roadmap

### Canonical plan

[`.cursor/plans/support_tickets_and_email_domain_16384eba.plan.md`](../.cursor/plans/support_tickets_and_email_domain_16384eba.plan.md)
— the master multi-phase plan covering the FlyFDX.com rebrand, email
domain migration, support-ticket overhaul, admin inbox, bell
notifications, and App Hosting deploy.

### Phase A — ✅ complete (pending manual smoke test)

Executed via
[`.cursor/plans/resume_phase_a_email_domain_bd960258.plan.md`](../.cursor/plans/resume_phase_a_email_domain_bd960258.plan.md).

Scope:
- Stripped `fedexinbound.com` + every hardcoded email domain from
  `src/lib/email.ts` and `src/lib/interview-utils.ts`.
- Added production fail-fast env resolution for `NEXT_PUBLIC_APP_URL`,
  `EMAIL_FROM`, `EMAIL_REPLY_TO`.
- Introduced shared email header / footer (`renderEmailShell` helper)
  with the unified FlyFDX.com / Pilot History Portal branding.
- Rewrote Email 2 (`buildFlowStartedEmail`), Email 2b
  (`buildSubmissionEmail`), Email 3 (`buildIndoctrinationEmail`, renamed
  from `buildInterviewEmail`).
- Retired the welcome-email flow (`send-welcome-email.ts`,
  `triggerWelcomeEmail`) and cleaned up unused
  `triggerApplicantTokenEmail` / `triggerApplicantRejectionEmail`.
- Flipped admin review page from "Interview invite" to
  "Indoctrination invite" wiring: mail type `indoctrination_invite`,
  audit action `indoctrination_invited`, `flowStatus: indoctrination_invited`,
  `indoctrinationInvitedAt` timestamp.
- Added `/dashboard/indoctrination` (authenticated class-details page)
  and `/help` (public, unauth).
- Deleted retired `/schedule/page.tsx` and `/admin/interviews/page.tsx`;
  slimmed `src/lib/interview-utils.ts` to `buildClassIcs` + `downloadIcs`;
  dropped Interviews nav entries; cleaned the scheduling page's
  "Open Interview Management" card.
- Renamed `interview_invite` → `indoctrination_invite` in the email-log
  panel and `interview_invited` → `indoctrination_invited` in the
  activity feed.
- Added `purgeLegacyInterviewData` admin action +
  `/admin/maintenance` page with a phrase-gated confirmation button to
  clean up retired `interviewSlots` / `interviewBookings` data.
- Fixed `middleware.ts` to include `/help` in public paths (was the one
  follow-up bug from the plan execution).

Verification at checkpoint:
- `npm run typecheck` → clean (after clearing stale `.next/types`).
- `npm run lint` → ⚠ Next.js 16 removed `next lint` and this repo has
  no standalone ESLint config. Relying on in-editor diagnostics.
- `rg -i "fedexinbound|fedex-inbound|pilotportal\.fedex|interview_invite|interview_invited"`
  → zero hits.

### Phase A — manual smoke test (TODO)

Before tagging Phase A done:

1. Set local env: `NEXT_PUBLIC_APP_URL`, `EMAIL_FROM`, `EMAIL_REPLY_TO`,
   `NEXT_PUBLIC_SUPPORT_EMAIL`, `RESEND_API_KEY` (see `.env.example`).
2. From `/admin/review/[uid]`, trigger each of the three candidate
   emails (flow started, submission confirm, indoctrination invite) and
   verify header / footer / links render against `NEXT_PUBLIC_APP_URL`.
3. Visit `/help` (signed out) — should not redirect to `/login`.
4. Visit `/dashboard/indoctrination` (signed in) — CTA should only
   appear when `canBookIndoctrinationSession` is true for the user.
5. Visit `/admin/maintenance` — confirm the purge dialog requires the
   exact phrase `DELETE INTERVIEWS` before enabling the destructive
   button.

### Phases B–D — deferred

From the canonical plan but not yet started:

- **Phase B — Support tickets.** Replace `mailto:` flows in
  `/dashboard/help` with an in-app ticket system (Firestore-backed,
  viewable by admin). Will rewrite `src/app/dashboard/help/page.tsx`.
- **Phase C — Admin inbox + bell notifications.** Unified admin inbox
  with Firestore `adminNotifications` collection; bell icon in the
  navbar with unread count.
- **Phase D — Production deploy.** Firebase App Hosting env vars,
  domain verification in Resend, Auth authorized domains, prod App
  Check provider.

---

## 2. Known cleanup items (pre-existing, non-blocking)

These are tidy-ups the session surfaced but didn't tackle. None block
the push or Phase A; track them for a future chore commit.

- **Stale `env.local.example`** — this file at the repo root references
  the deleted `src/ai/flows/send-welcome-email.ts` flow and duplicates
  `.env.example` from a previous era. Either update it to match the new
  email env contract or delete it (canonical is `.env.example`).
- **README.md is messy.** The current README is half "Firebase Studio
  starter" boilerplate and half deploy notes. A future chore: rewrite
  it to cover (a) what the app does, (b) local setup, (c) scripts, (d)
  where to find deeper docs.
- **`Github.md` at repo root** — two-line stub. Fold into README or
  delete.
- **Pre-existing uncommitted edits folded into Phase A** — these were
  left as-is per the plan (they ride along with the Phase A commit):
  - `src/app/dashboard/help/page.tsx` — phone card dropped, "Unlock
    submitted records" wording (Phase B will rewrite this file entirely).
  - `src/app/dashboard/page.tsx` — "Application" → "Pilot History
    Update" wording.
  - `src/components/application-form.tsx` — ACK progress bar removed.
- **Stray files removed by this session**: `.modified` (0-byte touch
  file), `package-lock copy.json` (stray duplicate). Now `git rm`'d.

---

## 3. Hardened `.gitignore` (what changed this session)

- Added `*.local` (Next.js convention, defense-in-depth beyond `.env*`).
- Added `.firebase/` (local emulator state).
- Added tree-wide glob for service account JSON: `**/*service-account*.json`,
  `**/*service_account*.json`, `**/*firebase-adminsdk*.json`.
- Added editor/OS cruft buckets: `Thumbs.db`, `*.swp`, `.idea/`,
  `.vscode/`, `*.key`, `*.p12`.
- Added agent-state buckets: `.cursor/` (per-session cache), `.aider*`.
  `.claude/` was already ignored.
- Added stray-scratch patterns: `* copy.*`, `*.bak`, `*.orig`, `.modified`.

Verification command:

```bash
git status --ignored --short
```

Expected ignored set (on the original machine):
`.claude/`, `.env.local`, `.next/`, `next-env.d.ts`, `node_modules/`,
`scripts/service_account.json`, `scripts/*firebase-adminsdk*.json`,
`tsconfig.tsbuildinfo`.

---

## 4. Open architectural questions

- **ESLint**. Next 16 dropped `next lint`; the repo has no standalone
  ESLint config. Decide whether to add one (flat config + `eslint-config-next`)
  or rely on TypeScript + editor diagnostics. No urgency — types are
  strict and catch most issues.
- **Firebase project strategy**. SECURITY.md recommends separate dev vs
  prod projects. Currently one project (`studio-3449665797-2559e`).
  Revisit before Phase D.
- **`candidatePipeline.{uid}.eligibleForIndoctrination` vs `flowStatus`**.
  Phase A settled on using `flowStatus: 'indoctrination_invited'` + the
  existing `INDOCTRINATION_BOOKING_FLOW_STATUSES` list in
  `src/lib/scheduling-eligibility.ts` to unlock the CTA. The earlier
  plan referenced a boolean `eligibleForIndoctrination` flag — that
  flag is not used; do not re-introduce it.
