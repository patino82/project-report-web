# Test Plan

## Automated Checks
1. Run `npm run prisma:generate` after dependency or schema changes.
2. Run `npm run lint`.
3. Run `npm run test`.
4. Run `npm run build`.

## Core Flow
1. Start app with `npm run dev`.
2. Open `/` and verify the project list contains only records from the database.
3. If the project list is empty, create a project or import a workbook.
4. Open a real project from the list.
5. Verify KPI cards, critical path, and assistant actions render from that project's data.
6. Open that project's lookahead page and verify legend text and lookahead payload.
7. Change a status and confirm the saved timestamp appears without a page reload.
8. Change and clear a lookahead mark and confirm both operations persist after refresh.
9. Use Download Workbooks and confirm both the project workbook and empty template download successfully.

## API
1. `GET /api/projects` returns real database projects only.
2. `GET /api/projects/:projectId/dashboard` returns computed summary for a real project.
3. `GET /api/projects/:projectId/tasks` returns real tasks and statuses for a real project.
4. `GET /api/projects/:projectId/lookahead` returns real lookahead entries for a real project.
5. `POST /api/projects/:projectId/status` with a valid task persists for a real project.
6. `POST /api/projects/:projectId/lookahead` with a valid symbol persists for a real project.
7. `POST /api/projects/:projectId/lookahead` with an empty symbol clears the stored mark.
8. `GET /api/projects/:projectId/workbook` downloads a populated workbook.
9. `GET /api/projects/:projectId/workbook-template` downloads `Project_Report_Template_Empty.xlsx`.
10. Unknown project IDs return `404` where the endpoint loads a project bundle.
11. Unknown task IDs return `404` for status and lookahead write routes.

## Rules Validation
1. Confirm effective completion requires confirmation + inspection pass when required.
2. Confirm blocked/unlocked counts react to predecessor completion.
3. Confirm critical path fails on cycle (domain function test).

## Migration/Import
1. Run `npm run import:workbook -- /abs/path/workbook.xlsx`.
2. Confirm the import exits successfully without generating committed scratch files.
3. Validate the project, task, status, company, and contact records in the app.
