# Gemini Context: `src/lib`

This directory holds shared web app logic. Prefer pure functions here when possible so business rules can be covered by Vitest.

Key files:

- `domain.ts`: completion truth, unlock/blocking logic, critical path, dashboard summary, assistant actions, and boss email text.
- `project-data.ts`: Prisma-backed project bundle loading and DTO shaping.
- `workbook.ts`: workbook/date helpers used by import/export flows.
- `sequence-templates.ts`: construction task templates and dependencies.
- `types.ts`: shared lightweight domain types.

Rules:

- Completion truth is strict: a task is effectively complete only when `confirmedComplete` is true and any required inspection has passed.
- Keep dependency logic deterministic and cycle-safe.
- Add or update `*.test.ts` coverage for changed pure business logic.
- Avoid importing Prisma into pure domain modules; keep database access in data/API layers.
