# Project Lookahead Web — Backend Fixes + UI Polish

## Context
This is a Next.js 16 app (TMA — Tactical Mission Architecture) for construction project management. It uses:
- NextAuth for Google OAuth
- Prisma + Neon Postgres
- Tailwind CSS 4 with custom CSS vars
- TMA design system (dark mode, glassmorphism, construction orange #e07b35)

The web app UI has already been themed with the TMA design system. This task focuses on backend robustness fixes.

## Critical Issues to Fix

### 1. CORS Bug (M4 in PROJECT_STATUS.md)
File: `src/lib/cors.ts`
Problem: Sets `Access-Control-Allow-Origin: *` AND `Access-Control-Allow-Credentials: true` — browsers reject this combination. When credentials are used, origin must be explicit.

Fix:
- Read `request.headers.get("origin")` in `corsResponse()` instead of hardcoding `*`
- If origin matches an allowed list, set `Access-Control-Allow-Origin` to that specific origin; otherwise don't set CORS headers (safe default)
- If origin is missing (server-side request), don't set CORS headers
- Read allowed origins from `process.env.ALLOWED_ORIGINS` (comma-separated), fallback to allowing the app's own domain from `NEXT_PUBLIC_APP_URL` or `NEXTAUTH_URL`
- Keep `Access-Control-Allow-Credentials: true`

### 2. Notion Sync Blocks Writes (M5 in PROJECT_STATUS.md)
File: `src/lib/notion-sync.ts` and `src/app/api/projects/route.ts`
Problem: In the POST /api/projects handler, `pushProjectToNotion` is called BEFORE `prisma.project.create`. If Notion is down, the entire project creation fails.

Fix:
- In `src/app/api/projects/route.ts`: Create the project in the database FIRST, then try Notion sync. If Notion fails, continue anyway — the project should still be created.
- Store `notionId` as null if Notion sync fails, and add a background retry mechanism (just a function that can be called later, no need for a full queue system)
- Ensure `pushProjectToNotion` and other Notion functions never throw — they should catch and return null on any error

### 3. No API Rate Limiting (W4 in PROJECT_STATUS.md)
File: Create `src/lib/rate-limit.ts`
Problem: API routes have no rate limiting, vulnerable to abuse.

Fix:
- Create a simple in-memory rate limiter (token bucket or sliding window)
- Apply it to: POST /api/projects, POST /api/projects/[id]/site-logs, POST /api/projects/[id]/open-items, POST /api/projects/[id]/status, POST /api/auth/exchange
- Allow ~30 requests per minute per IP, with a 429 response when exceeded
- Use `x-forwarded-for` header for IP detection (Vercel sets this), fallback to a placeholder for local dev
- Do NOT apply rate limiting to GET requests (read-only)

### 4. criticalPath Algorithm Performance (W5 in PROJECT_STATUS.md)
File: `src/lib/domain.ts`
Problem: The `buildSummary` / `criticalPath` algorithm is O(n²) and will be slow on large projects.

Fix:
- Profile the current algorithm first (don't guess)
- Optimize using Map-based lookups instead of nested array.find() calls
- Target: O(n) or O(n log n) for the critical path computation
- Preserve the existing input/output contract — all tests must still pass

## Constraints
1. **Run tests after changes**: `npx vitest run` — all existing tests must pass
2. **Run tsc after changes**: `npx tsc --noEmit` — zero TypeScript errors
3. **No new dependencies** — use only packages already in package.json
4. **No `.env` modifications** — use env var reads only
5. **Commit locally when done** with a descriptive commit message
6. Next.js docs: https://nextjs.org/docs

## Files You'll Be Working In
- `src/lib/cors.ts` — fix CORS origin handling
- `src/lib/notion-sync.ts` — make Notion sync non-blocking
- `src/app/api/projects/route.ts` — reorder create + Notion sync
- `src/lib/domain.ts` — optimize criticalPath
- `src/lib/rate-limit.ts` — NEW file for rate limiting
- `middleware.ts` — may need to apply rate limiting
- Any API routes that need rate limiting applied
