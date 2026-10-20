# Contributing

## Local development

1. Install dependencies: `npm install`
2. Start app: `npm run dev`
3. Validate before commit:
   - `npm run typecheck`
   - `npm run test`
   - `npm run lint`
   - `npm run build`

## Pull requests

- Keep changes scoped and reversible.
- Preserve legacy feature parity unless explicitly migrating that feature.
- Include docs updates for architecture or security-impacting changes.

## Security

- Never commit secrets.
- Avoid logging private task data in plaintext.
