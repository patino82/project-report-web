# Gemini Context: `src/app`

This directory uses the Next.js App Router. Keep route folders lowercase or dynamic, and keep server-side data loading in page/API route files unless a client component is required for interaction.

Important routes:

- `/` and `/dashboard` list project entry points.
- `/projects/[projectId]` is the project command center.
- `/projects/[projectId]/assistant` is the operations/status workflow.
- `/projects/[projectId]/lookahead` is the field lookahead editor.
- `/api/projects/[projectId]/*` powers dashboard, status, lookahead, report, boss email, and workbook outputs.

Rules:

- Preserve real-data behavior; do not reintroduce sample fallback projects.
- Unknown project IDs should return clean `404` responses.
- Validate web changes with `npm run lint`, `npm run test`, and `npm run build` from `project-report-web/`.
- Keep API responses explicit JSON or typed binary attachments with clear filenames.
