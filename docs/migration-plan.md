# Orma Migration Plan

## Goals

- Preserve all current product behavior and visual identity.
- Move to typed, modular architecture with incremental regression control.
- Introduce secure auth, cloud sync, and subscription infrastructure.

## Source-of-truth strategy

1. Local-first remains active during migration.
2. Cloud sync is opt-in and explicit.
3. Local and cloud conflicts must use user-confirmed merge/import flows.

## Stages

### Stage A - Audit

- Complete feature inventory and risk analysis.
- Document storage keys, event flows, and technical debt.

### Stage B - Foundation

- React + TS + Vite setup.
- Shared types and storage abstractions.
- CI baseline and test harness.
- Legacy bridge route to keep app working.

### Stage C - Feature migration

- Extract map, planner, calendar, focus, settings into modules.
- Keep parity tests for behavior before/after extraction.

### Stage D - Data and accounts

- Supabase schema, migrations, and RLS.
- Auth routes and protected account pages.
- Local/cloud merge workflow.

### Stage E - Public beta hardening

- Error states, offline states, and accessibility pass.
- Deployment guides and runbooks.

### Stage F - Premium and billing

- Entitlement service.
- Provider-backed checkout and webhook verification.
- Subscription lifecycle handling.

### Stage G - Release validation

- Build/test/lint/security checks.
- Access control verification and regression signoff.

## Decisions completed in this stage

- Legacy app preserved in `public/legacy/index.html`.
- New app shell introduced with route-level migration entry points.
- Initial typed domain contracts and adapter interfaces added.
