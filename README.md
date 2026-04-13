# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
# Pilot-App
Here’s a practical checklist so things work after you push to GitHub and run on live Firebase (you have @apphosting/adapter-nextjs and apphosting.yaml, so the intended path is Firebase App Hosting for Next.js, not the old firebase.json → build SPA setup).

1. Secrets and GitHub
Do not commit .env.local, scripts/service_account.json, scripts/*firebase-adminsdk*.json, or any service account JSON. Your .gitignore should keep those out; confirm with git status before pushing.
In Firebase App Hosting (or your CI), set environment variables as secrets, not in the repo:
All NEXT_PUBLIC_* values for your production Firebase project (same project as prod Firestore/Auth).
FIREBASE_SERVICE_ACCOUNT_JSON — full service account JSON as one minified line (needed for server actions / Admin SDK on the host).
2. One Firebase project for production
Production hosting should use the same Firebase project ID as production Firestore rules you’ve been deploying to.
After push, deploy or auto-deploy so firestore.rules (and indexes if you change them) match what’s in the repo (firebase deploy --only firestore:rules from your machine, or your pipeline).
3. Firebase App Hosting + GitHub
In Firebase Console → App Hosting (or Build): connect the GitHub repo, pick branch (e.g. main), and configure the build command / output as Firebase expects for the Next.js adapter (usually npm ci + npm run build or whatever the wizard sets).
Add every env var the app needs (mirror .env.local for prod values only), especially:
NEXT_PUBLIC_FIREBASE_*
FIREBASE_SERVICE_ACCOUNT_JSON
Any other server secrets (e.g. email APIs if used in production).
4. Authentication
Authentication → Settings → Authorized domains: add your production domain (e.g. yourapp.web.app, custom domain).
5. App Check
The debug token in the console is for local dev only. For production, configure real App Check (e.g. reCAPTCHA) in Firebase Console and use production keys in env — not the debug token.
6. firebase.json hosting (public: "build")
That config is classic static hosting (single-page index.html). It does not match a default Next.js App Router server build unless you explicitly export static files to build/.
If you actually deploy with Firebase App Hosting, the adapter drives deployment; treat firebase.json hosting as legacy unless you’ve wired a script that fills build/ from next export. If something is broken after deploy, this mismatch is a common cause — use one clear path: App Hosting for Next or static export, not both confused.
7. Production behavior you already added
removeConsole in next.config.ts runs for next build when NODE_ENV=production, so production client bundles strip most console.log calls (you already removed the form dump).
8. After first deploy
Smoke test: login, signup, application save/submit, admin actions that use server actions (token verify, etc.).
If server actions fail with credential errors, FIREBASE_SERVICE_ACCOUNT_JSON on the host is the first thing to verify.
If you tell me whether you’re using Firebase App Hosting only vs Vercel vs manual firebase deploy, the steps can be narrowed to a single path (e.g. exact GitHub → App Hosting env screen names).

Here’s a Firebase App Hosting–specific version of what matters for your setup (Next.js + @apphosting/adapter-nextjs + apphosting.yaml).

Connect GitHub → App Hosting
Firebase Console → Build (or App Hosting) → Get started / manage backend.
Link your GitHub repo and choose the branch you deploy from (e.g. main).
Firebase will use the repo’s build config (your apphosting.yaml and the adapter) to run npm ci / npm run build (exact steps follow what the console wizard sets).
Environment variables & secrets (critical)
In the App Hosting backend → Environment variables (or Secrets) UI:

Set all NEXT_PUBLIC_FIREBASE_* (and any other NEXT_PUBLIC_* you use) for your production Firebase project.
Set FIREBASE_SERVICE_ACCOUNT_JSON as a secret: one-line minified JSON for a service account in that same project (needed for firebase-admin / server actions on the server).
Do not rely on .env.local on GitHub; App Hosting injects env at build/runtime from the console.
After changing env vars, trigger a new rollout (redeploy) so the backend picks them up.

Same project everywhere
App Hosting, Firestore, Auth, and Storage should all be the same Firebase project you intend for production.
Deploy rules from your machine or CI when you change them:
firebase deploy --only firestore:rules
(indexes: firestore:indexes if you change indexes.)
Auth & App Check
Authentication → Settings → Authorized domains: add your App Hosting URL (and custom domain if you add one).
App Check: use a production provider in the console; don’t depend on the debug token in production builds.
What to ignore in Git
Keep .env.local and service account JSON out of git (you already ignore most of this). App Hosting never reads your laptop’s .env.local.
Verify after deploy
Open the live URL, run through login, application submit, and any flow that uses server actions (e.g. token verify). If those fail, FIREBASE_SERVICE_ACCOUNT_JSON or project/env mismatch is the usual cause.
Note on firebase.json → hosting.public: "build"
That’s the classic Hosting static bucket. App Hosting uses its own pipeline and your Next adapter; you don’t need to manually upload build/ for the Next app if everything is wired through App Hosting. If you’re only using App Hosting for this app, treat classic Hosting config as unused unless you’ve explicitly set up a second site.