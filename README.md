# Orma

Orma is a life-planning application centered on four areas: Career, Money, Health, and Family.

## Current status

This repository is in an incremental migration from a single-file app to a production-ready architecture.

- Legacy working app is preserved at `public/legacy/index.html`.
- New React + TypeScript + Vite foundation is active.
- The default route loads the legacy app in a full-screen bridge to preserve behavior while modules are extracted safely.
- First extracted native module is available at `/tasks` (typed local storage-backed tasks workflow).
- Second extracted native module is available at `/settings` (typed settings persistence workflow).
- Third extracted native module is available at `/focus` (typed timer runtime + task-linked focus workflow).
- Fourth and fifth extracted native modules are available at `/planner` and `/calendar`.

## Tech stack (foundation)

- React + TypeScript + Vite
- Zustand (state management baseline)
- Zod (schema validation baseline)
- Supabase JS client (auth/data integration baseline)
- Vitest + Testing Library (test baseline)

## Getting started

1. Install dependencies:
   - `npm install`
2. Start development:
   - `npm run dev`
3. Run checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`
   - `npm run build`

## Distribution

The hosted site (`/`) is the public download page. Open `/map` to sign in with Google or email/password. Data syncs through your Firebase account across devices.

1. Web + installable PWA (iPhone, iPad, Android, any desktop browser)
   - Visitors open the site; Android shows an Install button, iOS users follow the Add to Home Screen steps on the page.
2. Desktop apps (macOS universal `.dmg`, Windows `.exe`)
   - Build locally: `npm run desktop:pack` (outputs `release/Orma-mac.dmg` and `release/Orma-Setup.exe`).
   - Firebase Hosting's free plan rejects binaries, so publish them as assets of a GitHub release on `jinuhari/Orma` (names must stay `Orma-mac.dmg` and `Orma-Setup.exe`). Pushing a `v*` tag runs `.github/workflows/desktop-release.yml`, which builds both and attaches them.
   - The site links to `releases/latest/download/...`; override with `VITE_DOWNLOAD_MAC_URL` / `VITE_DOWNLOAD_WINDOWS_URL`.
   - Publish the site: `npm run site:deploy` (build + hosting + Firestore rules).
3. Desktop Google sign-in: the app opens the system browser at `/desktop-sign-in`, then returns via the `orma://` link. Email/password sign-in stays inside the app.
4. Native mobile shells (optional, not used for Google sign-in yet): `npm run mobile:ios`, `npm run mobile:android`.

Icons are generated from `scripts/generate-icons.mjs` (`npm run icons`).

Notes:
- Installers are unsigned. macOS: right-click > Open on first launch. Windows: More info > Run anyway.
- Cross-compiling Windows on macOS works for NSIS; signing certificates are needed to remove the warnings.

## Environment

Copy `.env.example` to `.env` and fill values.

Important:
- Never commit real secrets.
- `SUPABASE_SERVICE_ROLE_KEY` and payment/webhook secrets are server-only.

### Authentication and cloud sync (Firebase)

1. Create or open your Firebase project at https://console.firebase.google.com/.
2. Authentication > Sign-in method: enable **Google** and **Email/Password**.
3. Authentication > Settings > Authorized domains: make sure your hosting domain is listed.
4. Firestore Database: click **Create database** (production mode). Then run `firebase deploy --only firestore:rules`.
5. Project settings > General > Your apps > Web app: copy config into `.env`:
   - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
   - Optional: `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_PUBLIC_APP_URL`

Data model: each account stores one document per saved item under `users/{uid}/store/{key}` (tasks, map layout, finance, settings, photo). Rules in `firestore.rules` restrict access to the owner. Conflicts resolve last-writer-wins per item.

The sign-in screen includes email account creation and password reset through Firebase's hosted email action handler. In the full app, open **Settings > Account > Log out** to leave the account. Logout attempts to upload pending changes before ending the session; offline changes remain on this device for the same account.

For a local demo without authentication or cloud sync, run `VITE_DEMO_MODE=true npm run dev`. This flag is development-only and is ignored in production builds. Demo data stays in browser storage; use a separate browser profile or origin from real accounts.

## Repository layout

- `src/app`: app shell, providers, routes
- `src/features`: feature modules and migration targets
- `src/services`: storage/auth/subscription/sync services
- `src/types`: shared domain models
- `supabase/migrations`: SQL schema and RLS policies
- `docs`: architecture, audit, and migration notes

## Migration notes

- Stage A audit and migration strategy: `docs/stage-a-audit.md`
- Incremental migration plan: `docs/migration-plan.md`
- Stage C extraction progress: `docs/stage-c-progress.md`

## Manual setup still required

- Provision Supabase project and apply migrations.
- Implement server-side checkout and webhook verification in Supabase Edge Functions.
- Configure production auth flows and password recovery templates.
- Add real E2E test automation for critical flows.

## Security baseline

- Do not expose service role keys or payment secrets in frontend code.
- Enforce authorization in database policies and backend functions.
- Keep private task content out of analytics/error logs.
