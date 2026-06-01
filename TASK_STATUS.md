# Web App (Next.js) — Task Status

> Last updated: 2026-05-30
> Read this file before doing ANY work in this directory.

## Current State
- Next.js app with Prisma + Neon Postgres
- NextAuth with Google OAuth
- API routes for projects, tasks, daily logs, open items, task statuses
- Notion sync on project/log/item creation (can fail silently)
- OPENROUTER_API_KEY is set in .env.local but NOT used by any code yet

## Last Completed Work
- Initial build by Codex/Opencode
- Full schema design (Project, Task, TaskStatus, Dependency, Contact, Company, Trade, SiteLog, OpenItem, LookaheadEntry, VersionLog)
- API routes with Zod validation
- Dashboard summary builder (critical path, unlock analysis, health score)

## Next Steps (Priority Order)
1. Add auth middleware to API routes (currently unprotected — anyone can call them)
2. Fix CORS config: remove Access-Control-Allow-Credentials + * origin conflict
3. Make Notion sync non-blocking (call after DB write, don't gate on it)
4. Fix POST /api/projects/[id]/site-logs — add CORS wrapper (all other routes use corsResponse())
5. Add rate limiting middleware
6. Optimize criticalPath algorithm from O(n²) to O(n + e)
7. FULL WEB APP UI/UX REDESIGN:
   - Modernize dashboard — current layout is dated, needs visual hierarchy
   - Project detail page: consolidate redundant sections, cleaner task visualization
   - Add calendar/date pickers for all date inputs (currently text-only)
   - Task list: replace flat table with status-grouped cards or Kanban-style
   - Daily log: better form layout, date picker, photo attachment support
   - Responsive mobile-first layout (field superintendent will view on phone/tablet)
   - Dark mode support
   - Performance: add proper loading states, prevent layout shift
   - Reference design: ../Stitch/ folder (elite dark mode, glassmorphism, construction orange/teal)
8. Deploy to Vercel with Neon production database

## UI/UX Redesign Details
Current problems:
- Dashboard has no visual hierarchy — all info is the same weight
- Project detail pages feel cluttered with redundant sections
- Task visualization is a flat list — needs timeline/Gantt or grouped by status
- Date inputs are text fields — should be calendar popups
- Not optimized for mobile/tablet (field use)
- No loading states — pages flash blank while fetching
- No empty states — confusing when there's no data
- Design feels dated (2020-era Next.js default)

## Environment Variables (.env.local)
- DATABASE_URL: set (Neon Postgres via Prisma)
- GOOGLE_CLIENT_ID: set
- GOOGLE_CLIENT_SECRET: set
- NEXTAUTH_SECRET: set
- OPENROUTER_API_KEY: set (not yet used in code)
- NEXT_PUBLIC_BASE_URL: http://localhost:3000

## API Routes
All routes are under /api/:
- /api/auth/[...nextauth] — NextAuth
- /api/auth/exchange — mobile Google OAuth exchange (returns JWT)
- /api/health — health check
- /api/companies — company CRUD
- /api/trades — trade CRUD
- /api/projects — project list/create
- /api/projects/[id] — project detail
- /api/projects/[id]/dashboard — summary with unlock/critical path
- /api/projects/[id]/tasks — tasks list
- /api/projects/[id]/status — task status upsert
- /api/projects/[id]/site-logs — daily logs
- /api/projects/[id]/open-items — open items/blockers
- /api/projects/[id]/lookahead — lookahead entries
- /api/projects/[id]/boss-email — boss email generator
- /api/projects/[id]/report — project report
- /api/projects/[id]/apply-template — apply task template
- /api/projects/[id]/workbook — workbook data
- /api/projects/[id]/workbook-template — workbook template
- /api/sequence/templates — sequence templates

## Known Issues
- POST /api/projects/[id]/site-logs missing CORS wrapper (all other routes use corsResponse())
- pushOpenItemToNotion: if project.notionId is null, silently skips Notion with no warning
- ensureProjectCalendarCurrent: race condition on concurrent requests
- No auth middleware on any API route (exchange route issues JWT but nothing validates it)

## How to Update This File
Add a line after each work session documenting what changed.
