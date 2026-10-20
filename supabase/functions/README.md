# Supabase Edge Functions (planned)

Planned privileged functions:

1. `create-checkout-session`
- Input: authenticated user, target plan code
- Responsibility: create provider checkout session server-side

2. `billing-webhook`
- Responsibility: verify signed webhook payloads, upsert subscription state idempotently

3. `reconcile-subscriptions`
- Responsibility: periodic reconciliation for failed/late webhook delivery

4. `ai-task-assist` (future)
- Responsibility: gated AI assistance with rate-limits and entitlement checks

## Security requirements

- Never expose service role keys in frontend.
- Verify provider signatures for webhooks.
- Enforce user ownership and entitlements server-side.
- Avoid logging private task content.
