# Claude Code — Pilot-App

Canonical AI working notes for this repo live in [AGENTS.md](./AGENTS.md).
`.cursorrules`, `CLAUDE.md`, and `AGENTS.md` share the same content source
so Claude Code, Cursor, and other tools stay aligned.

**Read [AGENTS.md](./AGENTS.md) before making non-trivial changes.** It
covers:

- Product + stack summary (Next.js 16, Firebase, Resend, Genkit)
- Directory map (`src/app/`, `src/lib/`, `src/components/`, Firestore collections)
- Environment variables and fail-fast production behavior
- Coding conventions (commits, TS, server actions, rules, email templates)
- Auth gates (`middleware.ts` + `src/components/auth-gate.tsx`)
- Scripts (`npm run dev`, `typecheck`, etc.)

For current session state (in-flight plans, deferred work, smoke-test
checklist), see [`docs/current_status.md`](./docs/current_status.md).

## Hard rules (duplicated here for quick reference)

1. Never commit secrets, service account JSON, or `.env.local`. `.gitignore`
   covers these — do not fight it.
2. Never hardcode domains in email templates. Use `getPublicPortalOrigin()`
   from `src/lib/email.ts` and `SUPPORT_EMAIL` from `src/lib/support-contact.ts`.
3. Never edit `.cursor/plans/*.plan.md` when executing a plan — those files
   are the source of truth.
4. Match plan-specified copy verbatim when plans specify wording for
   user-facing emails or pages.
5. Run `npm run typecheck` before claiming a change is ready. `npm run lint`
   is currently broken (Next.js 16 removed `next lint`); rely on in-editor
   diagnostics.
6. Deploy commands (`firebase deploy`, `git push`) are user-initiated only.

## Local skills / workflows available

This workspace has a rich set of personal skills configured (gstack QA,
codex review, plan-ceo-review, etc.) under `~/.claude/skills/`. Use them
when the user asks for their documented trigger phrases (e.g. "ship",
"qa", "review this plan"). They are personal, not project scoped.
