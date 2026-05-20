# Project Report Assistant Web App

Current release: `v1.5.2`

Production-ready superintendent web app with scheduling intelligence, lookahead control, contact management, boss-email generation, and one-click 2-week PDF.

## Core Features
- Project command center with health score, critical path, blockers, unlocked tasks, and call-now queue.
- Per-project profile fields stored in the app and workbook:
  - `StructureType`: `House` or `Condo`
  - `ScopeType`: `BathRemodel`, `PartialRemodel`, `FullRemodel`, `Addition`, `NewBuild`
- One-click paired workbook export via `Download Workbooks`:
  - live project workbook
  - clean new-project template workbook
- Completion truth rule enforced in logic:
  - complete only when `confirmedComplete=true`
  - and inspection passed when inspection is required.
- Assistant operations console:
  - Task status board editor
  - Sequence builder templates
  - Partner/contact/trade manager
- Sequence template combinations:
  - `Condo`: BathRemodel, PartialRemodel, FullRemodel
  - `House`: BathRemodel, PartialRemodel, FullRemodel, Addition, NewBuild
- Lookahead editor with legend symbols:
  - `X` performed
  - `/` scheduled
  - `0` behind
  - `!` inspection milestone
- Boss email generation endpoint from live project data.
- 2-week PDF report endpoint for Monday boss send.

## API Surface
- `GET/POST /api/projects`
- `GET/PATCH /api/projects/:projectId`
- `GET /api/projects/:projectId/dashboard`
- `GET/POST /api/projects/:projectId/tasks`
- `POST /api/projects/:projectId/status`
- `GET/POST /api/projects/:projectId/lookahead`
- `GET /api/projects/:projectId/boss-email`
- `GET /api/projects/:projectId/report` (PDF)
- `GET /api/projects/:projectId/workbook` (project workbook)
- `POST /api/projects/:projectId/apply-template`
- `GET/POST /api/companies`
- `GET /api/trades`
- `GET /api/sequence/templates`

## Quick Start (Local Dev)
```bash
cd "/Users/papi/Desktop/Project Lookahead/Codex Project Report/project-report-web"
npm install
cp .env.example .env.local
# Edit .env.local and set DATABASE_URL to your local/Dev Neon connection string.
npm run prisma:generate
npm run prisma:migrate -- --name init_postgres
npm run seed:demo   # optional -- populates a demo project for local testing
npm run dev
```

### Production (Vercel + Neon)
After migrations are committed, run in production:
```bash
npm run prisma:generate
npm run prisma:deploy   # applies only committed migrations; never use prisma:migrate in production
```
`seed:demo` is **optional** and **not production-safe** (it refuses to run when `NODE_ENV=production` unless you set `SEED_DEMO_ALLOW_PRODUCTION=1`).
See `docs/DEPLOYMENT_VERCEL_NEON.md` for the full runbook.
Open `http://localhost:3000`.

Health check:
```bash
curl http://localhost:3000/api/health
```

Demo project after seeding:
- `http://localhost:3000/projects/craig-f10`

## Import Existing Workbook Into DB
```bash
npm run import:workbook -- "/absolute/path/to/your-workbook.xlsx"
```
Optional project override:
```bash
npm run import:workbook -- "/absolute/path/to/your-workbook.xlsx" --project "Project Name"
```

## Generate Monday Boss PDF
Use browser:
- `http://localhost:3000/api/projects/<projectId>/report`

Or CLI:
```bash
curl -L "http://localhost:3000/api/projects/<projectId>/report" -o 2week-report.pdf
```

## Notes
- Database is PostgreSQL via Prisma. Neon is the recommended hosted database for Vercel deployment.
- Use `docs/DEPLOYMENT_VERCEL_NEON.md` for Vercel + Neon setup.
- Use `TEST_PLAN.md` for operational validation.
- Workbook export is based on the clean template in `public/templates/Project_Report_Template_Empty.xlsx`.
