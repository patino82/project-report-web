# Vercel + Neon Deployment Runbook

## Decision

Use **Vercel Hobby + Neon Postgres + Auth.js** as the production path.

Budget target remains lean, but feature ROI can justify Make.com or service upgrades.

## Required services

- Vercel project with root directory set to `project-report-web/`.
- Neon Postgres database.
- Auth.js added in a follow-up implementation pass.

## Environment variables

Set these in Vercel Project Settings -> Environment Variables:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
AUTH_SECRET="..."
AUTH_URL="https://your-vercel-domain.vercel.app"
AUTH_TRUST_HOST="true"
APP_BASIC_AUTH_USER="admin"
APP_BASIC_AUTH_PASSWORD="long-random-private-beta-password"
```

Generate `AUTH_SECRET` locally:

```bash
openssl rand -base64 32
```

`APP_BASIC_AUTH_USER` and `APP_BASIC_AUTH_PASSWORD` are the private-beta access
gate. When both are set, all app pages and APIs except `/api/health` require
browser Basic Auth. Leave them unset only for local development or after proper
Auth.js user authentication is implemented.

## Neon setup

1. Create a Neon project.
2. Create a production database.
3. Copy the pooled connection string if available.
4. Use it as `DATABASE_URL` in Vercel.
5. Never commit the real connection string.

## Prisma migration path

The app has moved from SQLite to PostgreSQL in `prisma/schema.prisma`.

### Local development

Use `prisma:migrate` (creates+applies migrations against your local/Dev database):

```bash
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init_postgres
npm run seed:demo          # optional -- local dev only; see note below
```

### Production (Vercel + Neon)

Use **`prisma:deploy`** only. **Do not run `prisma:migrate` in production.**

```bash
npm run prisma:generate
npm run prisma:deploy   # applies only the migrations already reviewed and committed
```

`prisma:migrate` opens an interactive prompt and writes migration files to disk; it must never run in production.

### seed-demo -- optional and not production-safe

`seed:demo` is a local/private-beta convenience for populating sample data.
It **refuses to run when `NODE_ENV=production`** (unless `SEED_DEMO_ALLOW_PRODUCTION=1` is set).

```bash
# Safe in local dev:
npm run seed:demo

# Explicit opt-in for a private-beta staging environment:
SEED_DEMO_ALLOW_PRODUCTION=1 npm run seed:demo
```

For production, seed only if you intentionally need sample data for a private beta
and set the explicit override.

## Vercel settings

- Framework preset: Next.js
- Root directory: `project-report-web`
- Build command: `npm run build`
- Install command: default
- Node.js: `>=22.12.0`

## Auth.js implementation plan

Auth is not wired into the app yet. Add it in this order:

1. Install `next-auth` and `@auth/prisma-adapter`.
2. Add Prisma auth models: `User`, `Account`, `Session`, `VerificationToken`.
3. Add app-domain models: `Organization`, `Membership`.
4. Add `organizationId` to business tables before multi-tenant production use.
5. Protect dashboard/project routes after auth is verified locally.

## Validation

Run before deploying:

```bash
npm run prisma:generate
npm run build
```

Run after setting a Neon `DATABASE_URL`:

```bash
npm run prisma:migrate -- --name init_postgres
npm test
```

Runtime smoke checks after deploy:

```bash
curl https://your-vercel-domain.vercel.app/api/health
curl https://your-vercel-domain.vercel.app/api/projects
```

## Current risk

Until Auth.js and tenant scoping are implemented, this app should be treated as
a private/admin beta, not a public multi-tenant SaaS. Set the Basic Auth
environment variables above before exposing a deployment URL beyond trusted
testers.
