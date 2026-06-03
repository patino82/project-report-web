# IMPLEMENTATION PROMPT — Audit Fixes

You are fixing security vulnerabilities and bugs in the Project Lookahead web app.
Work directory: `/Users/dave_patino/Desktop/ai/Project Lookahead/Codex Project Report/project-report-web-audit-fixes/`

## PHASE 1: SECURITY EMERGENCY (do these FIRST)

### Fix 1: Create shared API auth helper
Create file `src/lib/api-auth.ts` with:
- `requireAuth(request): { userId: string; role: string } | NextResponse`
- Reads `Authorization` header, extracts Bearer token
- Verifies JWT using `jsonwebtoken.verify(token, process.env.NEXTAUTH_SECRET!)`
- Returns `{ userId, role }` from decoded token on success
- Returns NextResponse with 401 on failure
- Also accept NextAuth session via `getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })` as fallback

### Fix 2: Add auth to ALL API routes
Edit every file in `src/app/api/` EXCEPT `src/app/api/health/route.ts` and `src/app/api/auth/*/route.ts`:
- Import and call `requireAuth()` at the start of GET/POST/PATCH/PUT/DELETE/OPTIONS handlers
- If it returns a NextResponse (401), return that immediately
- Routes to fix:
  - src/app/api/projects/route.ts
  - src/app/api/trades/route.ts
  - src/app/api/companies/route.ts
  - src/app/api/projects/[projectId]/route.ts (if it exists)
  - src/app/api/projects/[projectId]/tasks/route.ts
  - src/app/api/projects/[projectId]/site-logs/route.ts
  - src/app/api/projects/[projectId]/open-items/route.ts
  - src/app/api/projects/[projectId]/status/route.ts
  - src/app/api/projects/[projectId]/dashboard/route.ts
  - src/app/api/projects/[projectId]/lookahead/route.ts
  - src/app/api/projects/[projectId]/report/route.ts
  - src/app/api/projects/[projectId]/apply-template/route.ts

### Fix 3: Production-safe error messages
In ALL API routes, replace `(error as Error).message` in client-facing responses with generic messages:
- Prisma/DB errors → `"Internal server file operation error"` 
- Validation errors → keep Zod flatten (these are safe)
- Generic catch blocks → `"Internal server error"`
- Keep detailed logging via `console.error()` for server-side debugging
- Only include detailed errors when `process.env.NODE_ENV !== 'production'`

### Fix 4: Fix auth/exchange domain allowlist
Edit `src/app/api/auth/exchange/route.ts`:
- After decoding Google token, check `hd` (hosted domain) or `email` against an allowlist
- Read allowlist from `process.env.ALLOWED_EMAIL_DOMAINS` (comma-separated, e.g., "yourcompany.com,partner.com")
- If `ALLOWED_EMAIL_DOMAINS` is not set, allow all (backward compat)
- If set and email domain not in list, return 403 with "Domain not authorized"

### Fix 5: Align middleware matcher
Edit `middleware.ts`:
- Remove `api/projects` from the excluded patterns in the matcher
- Add a comment explaining that API routes handle their own auth via `requireAuth()`

## PHASE 2: ROUTE & SCHEMA FIXS

### Fix 6: Implement missing document routes
Create `src/app/api/projects/[projectId]/documents/route.ts`:
- Same pattern as open-items/route.ts (GET collection, POST create)
- Zod schema: `{ name: z.string().min(1), url: z.string().optional() }`
- Use `prisma.document` model (add to schema if needed, or skip if model doesn't exist yet)

### Fix 7: Implement item-level open-item routes
Create `src/app/api/projects/[projectId]/open-items/[itemId]/route.ts`:
- GET (single item), PATCH (update), DELETE
- PATCH schema: `{ description, priority, dueDate, status }` all optional
- Use `requireAuth()`, `rateLimit()`, `corsResponse()`, `corsOptions()`

### Fix 8: Add compound unique constraint to LookaheadEntry
Edit `prisma/schema.prisma`:
- Add `@@unique([projectId, taskId, date])` to `LookaheadEntry` model
- Run `npx prisma generate` after schema change
- Edit `src/app/api/projects/[projectId]/lookahead/route.ts`:
  - Remove `as any` from the upsert call
  - Use the generated `projectId_taskId_date` compound key directly

### Fix 9: Map dashboard API response to mobile contract
Edit `src/app/api/projects/[projectId]/dashboard/route.ts`:
- Add mobile-compatible fields to the response:
  - `stats.active` = count of tasks without "Complete" status
  - `stats.completed` = count of tasks with "Complete" status  
  - `stats.overdue` = count of tasks with due date in past and not complete
  - `stats.inspections` = count of taskStatuses with `inspectionRequired: true`
  - `tasks` = array of simplified task objects (id, name, status, dueDate)
- Keep existing `buildSummary` for web UI consumption

### Fix 10: Add @unique to Company.name
Edit `prisma/schema.prisma`:
- Change `name String` to `name String @unique` in Company model
- Run `npx prisma generate`
- Remove `as any` from company upsert calls in `src/app/api/companies/route.ts`

### Fix 11: Fix lint errors
Fix these specific ESLint errors:
- `@typescript-eslint/no-explicit-any`: Fix as many as possible (especially in route files)
- `@typescript-eslint/no-unused-vars`: Remove unused variables
- React hooks errors: Fix useState-in-effect pattern in ThemeContext.tsx

## AFTER ALL FIXES

1. Run `npx prisma generate`
2. Run `npx tsc --noEmit --pretty false` — must pass
3. Run `npm run test` — must pass (27+ tests)
4. Do NOT run `npm run lint` (we know it has pre-existing issues)
5. Commit with message: `fix(audit): security auth, error handling, schema constraints, missing routes`
6. Write a summary to /tmp/audit-fixes-summary.md listing every file changed and what was fixed

## IMPORTANT CONSTRAINTS
- Do NOT change business logic in domain.ts
- Do NOT modify the mobile app (that's a separate repo/worktree)
- Do NOT add new npm packages (use what's already installed: jsonwebtoken, jose, etc.)
- If `jsonwebtoken` is not installed, use `jose` which is already a dependency for NextAuth
- Keep all changes backward-compatible (feature-flag via env vars where possible)
