# Thursday Acceptance Checklist

Use Craig F10 as the release candidate project before relying on the app for live work.

## Startup

- [ ] `npm install` completes.
- [ ] `npm run prisma:generate` completes.
- [ ] `npm run dev` starts at `http://localhost:3000`.
- [ ] No `EMFILE` watcher errors appear.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `/api/projects` returns real project records.

## Real Data

- [ ] Home page lists only database projects.
- [ ] Craig F10 appears with real project metadata and task/status counts.
- [ ] No demo, sample, placeholder, or fake fallback project is shown.
- [ ] Unknown project URLs return a clean `404`.

## Project Workflow

- [ ] Craig F10 opens from the home page.
- [ ] Main page shows the field-command dashboard without overlapping controls.
- [ ] Main workflow includes `2-Week`, `Operations`, `Generate Boss 2-Week`, and `Download Workbooks`.
- [ ] Assistant actions are understandable and based on real project data.
- [ ] Metrics, critical path, action queue, contacts, and boss draft fit at desktop and mobile widths.

## Persistence

- [ ] Open `Operations`.
- [ ] Change one low-risk task status.
- [ ] Save the row and confirm the saved timestamp appears.
- [ ] Refresh the page and confirm the saved value remains.
- [ ] Open `Lookahead`.
- [ ] Change one low-risk lookahead mark.
- [ ] Confirm the saved timestamp appears.
- [ ] Clear the mark and confirm the blank cell persists after refresh.

## Outputs

- [ ] `Generate Boss 2-Week` opens the boss PDF.
- [ ] Boss email body is copied or a clear fallback message appears.
- [ ] `Download Workbooks` downloads the active project workbook.
- [ ] `Download Workbooks` downloads a clean new-project template.
- [ ] Report endpoint returns a PDF for Craig F10.

## Layout

- [ ] Desktop pages do not overlap text, buttons, tables, or action rows.
- [ ] Mobile pages wrap actions cleanly.
- [ ] Tables scroll horizontally where needed instead of breaking the viewport.

## Current Validation

- 2026-05-12: `npm run lint` passed.
- 2026-05-12: `npm run test` passed with 6 Vitest checks for `src/lib/domain.ts`.
- 2026-05-12: `npm run build` passed.
- 2026-05-12: Local HTTP checks passed for project list, Craig F10 detail, Craig lookahead, and unknown-project 404.
- 2026-05-12: Boss PDF endpoint returned `Craig_F10_2week_2026-02-09.pdf`.
- 2026-05-12: Boss email endpoint returned the Craig F10 weekly summary JSON.
- 2026-05-12: Workbook endpoint returned `Craig_F10_House_FullRemodel.xlsx`.
- 2026-05-12: GitHub Actions CI workflow added for install, lint, test, and build.
- 2026-05-12: Applied non-force npm audit fixes and updated Next.js to `16.2.6`; remaining no-fix dependency items are tracked in `docs/SECURITY_BACKLOG.md`.
- 2026-05-12: Scoped `GEMINI.md` orientation files added for `src/app`, `src/lib`, and `agent-system`.
- 2026-05-13: Workbook-template route added and verified.
- 2026-05-13: Status/lookahead unknown task writes verified as `404`.
- 2026-05-13: Blank lookahead mark clearing added and covered by tests.
- 2026-05-13: Main project page redesigned as a field-command dashboard and checked with desktop/mobile screenshots.
