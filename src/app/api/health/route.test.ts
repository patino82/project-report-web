import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock() must be at the true module top level (hoisted by vitest).
const db = vi.hoisted(() => {
  const $queryRaw = vi.fn();
  const projectFindUnique = vi.fn();
  return { $queryRaw, project: { findUnique: projectFindUnique } };
});

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return db;
  },
}));

// ----------------------------------------------
// 1. GET /api/health -- database OK (production)
// ----------------------------------------------
describe("GET /api/health -- DB OK (production)", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    db.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    db.project.findUnique.mockReset();
    const mod = await import("../health/route");
    GET = mod.GET as () => Promise<Response>;
  });

  it("returns 200 with database ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checks.database).toBe("ok");
  });

  it("does not leak raw database error details", async () => {
    const res = await GET();
    const bodyStr = JSON.stringify(await res.json());
    expect(bodyStr).not.toContain("FATAL");
    expect(bodyStr).not.toContain("ECONNREFUSED");
    expect(bodyStr).not.toContain("connection refused");
  });
});

// ----------------------------------------------
// 2. GET /api/health -- database OK (development)
// ----------------------------------------------
describe("GET /api/health -- DB OK (development)", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    db.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    db.project.findUnique.mockReset();
    const mod = await import("../health/route");
    GET = mod.GET as () => Promise<Response>;
  });

  it("returns 200 with database ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.checks.database).toBe("ok");
  });
});

// ----------------------------------------------
// 3. GET /api/health -- database ERROR (production)
// ----------------------------------------------
describe("GET /api/health -- DB error (production)", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = "production";
    db.$queryRaw.mockRejectedValue(
      new Error(
        "FATAL: remaining connection slots are reserved for non-replication superuser connections",
      ),
    );
    db.project.findUnique.mockReset();
    const mod = await import("../health/route");
    GET = mod.GET as () => Promise<Response>;
  });

  it("returns 503 without raw error message", async () => {
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.checks.database).toBe("error");
    expect(body.checks.databaseError).toBe("connection_failure");
  });

  it("does not leak the raw DB error text in production", async () => {
    const res = await GET();
    const bodyStr = JSON.stringify(await res.json());
    expect(bodyStr).not.toContain("remaining connection slots");
    expect(bodyStr).not.toContain("superuser");
    expect(bodyStr).not.toContain("FATAL");
  });
});

// ----------------------------------------------
// 4. GET /api/health -- database ERROR (development)
// ----------------------------------------------
describe("GET /api/health -- DB error (development)", () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    db.$queryRaw.mockRejectedValue(
      new Error(
        "FATAL: remaining connection slots are reserved for non-replication superuser connections",
      ),
    );
    db.project.findUnique.mockReset();
    const mod = await import("../health/route");
    GET = mod.GET as () => Promise<Response>;
  });

  it("returns 503 with raw error details", async () => {
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.checks.database).toBe("error");
    expect(body.checks.databaseError).toBe(
      "FATAL: remaining connection slots are reserved for non-replication superuser connections",
    );
  });
});

// ----------------------------------------------
// 5. workbook-template -- 404 when project not found
// ----------------------------------------------
describe("GET workbook-template -- 404 when project not found", () => {
  let GET: (
    req: Request,
    ctx: { params: Promise<{ projectId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    db.$queryRaw.mockReset();
    db.project.findUnique.mockResolvedValue(null);
    const mod = await import("../projects/[projectId]/workbook-template/route");
    GET = mod.GET as typeof GET;
  });

  it("returns 404 with JSON error body", async () => {
    const req = new Request("http://localhost/api/projects/missing/workbook-template");
    const res = await GET(req, { params: Promise.resolve({ projectId: "missing" }) });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Project not found");
  });
});

// ----------------------------------------------
// 6. workbook-template -- success response headers & sheets
// ----------------------------------------------
describe("GET workbook-template -- success response headers and sheets", () => {
  let GET: (
    req: Request,
    ctx: { params: Promise<{ projectId: string }> },
  ) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = "development";
    db.$queryRaw.mockReset();
    db.project.findUnique.mockResolvedValue({ id: "p1" });
    const mod = await import("../projects/[projectId]/workbook-template/route");
    GET = mod.GET as typeof GET;
  });

  it("returns Content-Type for an xlsx workbook", async () => {
    const req = new Request("http://localhost/api/projects/p1/workbook-template");
    const res = await GET(req, { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(200);
    const contentType = res.headers.get("Content-Type");
    expect(contentType).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("returns Content-Disposition with attachment filename", async () => {
    const req = new Request("http://localhost/api/projects/p1/workbook-template");
    const res = await GET(req, { params: Promise.resolve({ projectId: "p1" }) });
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("new-project-template.xlsx");
  });

  it("contains all required sheets in the workbook", async () => {
    const req = new Request("http://localhost/api/projects/p1/workbook-template");
    const res = await GET(req, { params: Promise.resolve({ projectId: "p1" }) });
    expect(res.status).toBe(200);

    const { read } = await import("xlsx") as Record<string, unknown>;
    const buffer = Buffer.from(await res.arrayBuffer());
    const workbook = (read as (buf: Buffer, opts: { type: string }) => Record<string, unknown>)(
      buffer,
      { type: "buffer" },
    );
    const sheetNames: string[] = workbook.SheetNames as string[];

    const expectedSheets = [
      "Project Info",
      "Sequence",
      "Task_Status",
      "Company Profiles",
      "LookAhead (Field)",
      "Cost Tracking",
      "Dashboard",
      "Gantt (Print)",
      "Graph Engine",
      "Graph Unlock",
      "Critical Path",
      "Settings",
      "Email_Boss",
      "2-week",
    ];

    for (const name of expectedSheets) {
      expect(sheetNames).toContain(name);
    }
  });
});
