# Security and Privacy Baseline

## Principles

- User data access is enforced server-side and in database RLS policies.
- Frontend feature flags are UX hints only, never authorization controls.
- Payment, webhook, and service-role secrets are never exposed to browser code.
- Private task content should not be logged in plaintext in analytics/errors.

## Current implementation baseline

- Supabase migration includes owner-scoped RLS policies for user data tables.
- Subscription writes are restricted to service-role context.
- Frontend includes no server-role credentials.

## Required next steps

1. Implement authenticated account routes and server-side handlers.
2. Add signed webhook verification and idempotent subscription updates.
3. Add server-side entitlement checks for premium operations.
4. Add structured audit logs with sensitive field redaction.
5. Add automated policy tests in CI.
