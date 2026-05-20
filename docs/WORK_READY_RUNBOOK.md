# Work-Ready Runbook

Use this runbook for the Thursday work-readiness pass. The app should only show real project data from the local database and workbook imports.

## Start The App

```bash
cd "/Users/dave_patino/Desktop/Project Lookahead/Codex Project Report/project-report-web"
npm install
npm run prisma:generate
npm run dev
```

Open `http://localhost:3000` and use the Craig F10 project for the primary field workflow.

## Daily Craig Workflow

1. Open `Craig F10` from the project list.
2. Review the field-command dashboard:
   - readiness
   - near-term blockers
   - callbacks due
   - inspections
   - action queue
   - next scheduled work
   - critical path
3. Open `Operations`.
4. Update task status rows that changed in the field.
5. Save each changed row and confirm the saved timestamp appears.
6. Return to the project and open `Lookahead`.
7. Mark the current two-week window with:
   - `X` work performed
   - `/` scheduled
   - `0` behind
   - `!` inspection milestone
8. Clear marks that no longer apply and confirm the blank state persists.
9. Return to the project page.
10. Click `Generate Boss 2-Week` for the PDF and email body.
11. Click `Download Workbooks` to export both the active project workbook and a clean new-project template.

## End-Of-Day Check

Run this before calling the app work-ready:

```bash
npm run lint
npm run test
npm run build
```

With the app running, validate the deployed/local runtime surface:

```bash
SMOKE_BASE_URL="http://localhost:3000" npm run smoke
```

If the private-beta Basic Auth gate is enabled, include credentials:

```bash
SMOKE_BASE_URL="https://your-vercel-domain.vercel.app" \
SMOKE_BASIC_AUTH_USER="admin" \
SMOKE_BASIC_AUTH_PASSWORD="your-private-beta-password" \
npm run smoke
```

Then verify:

- Craig F10 loads from `/api/projects`.
- Unknown project IDs return not-found or JSON error states, not demo fallback data.
- Unknown task IDs return `404` for status and lookahead writes.
- Status saves show a timestamp and persist after refresh.
- Lookahead saves show a timestamp and persist after refresh.
- Workbook and template downloads return `.xlsx` files.
- Boss PDF opens.

## Local Permission Notes

- The dev script intentionally uses `next dev --webpack` to avoid file watcher overload in this release workspace.
- If npm reports cache ownership problems, fix the user cache from Terminal:

```bash
sudo chown -R "$(id -u)":"$(id -g)" ~/.npm
```

This needs the Mac password and cannot be completed by an unattended agent session.
