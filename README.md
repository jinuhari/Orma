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

## Environment

Copy `.env.example` to `.env` and fill values.

Important:
- Never commit real secrets.
- `SUPABASE_SERVICE_ROLE_KEY` and payment/webhook secrets are server-only.

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
