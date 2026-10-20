# Deployment Notes (Baseline)

## Build

- `npm run build` creates production assets in `dist/`.

## Static hosting

This stage can be deployed to Vercel/Netlify/Cloudflare Pages as a static app.

Required runtime env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase

1. Create Supabase project.
2. Apply SQL from `supabase/migrations/0001_init.sql`.
3. Configure auth providers and redirect URLs.
4. Deploy Edge Functions after implementation.

## Billing backend

Do not deploy billing UI as functional until:
- Checkout/session endpoint is implemented.
- Webhooks are signature-verified.
- Subscription reconciliation and entitlements are active.
