# Security Backlog

Use this file for known dependency risks that cannot be safely resolved by a routine patch update.

## 2026-05-12 Audit Status

`npm audit --audit-level=high` reports three remaining advisories after non-force fixes and the Next.js 16.2.6 update:

- `xlsx`: high severity prototype pollution and ReDoS advisories. npm reports no fix available for the current package. Production hardening should evaluate replacing `xlsx` or constraining all workbook parsing to trusted files.
- `next/node_modules/postcss`: moderate severity CSS stringify advisory. npm reports no direct fix available through the current Next.js dependency tree.

Validation after applying available non-force fixes:

- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.
