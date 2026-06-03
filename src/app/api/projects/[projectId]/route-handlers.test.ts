import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postLookahead } from "./lookahead/route";
import { POST as postStatus } from "./status/route";

const prismaMock = vi.hoisted(() => ({
  task: {
    findUnique: vi.fn(),
  },
  taskStatus: {
    upsert: vi.fn(),
  },
  lookaheadEntry: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
  versionLog: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/api-auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    ok: true,
    userId: "test-user-id",
    role: "user",
    email: "test@example.com",
  }),
  checkDomainAllowlist: vi.fn().mockReturnValue(null),
}));

function request(body: unknown) {
  return new Request("http://localhost/api/projects/p1/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ projectId: "p1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.task.findUnique.mockResolvedValue({ id: "task-db-id" });
  prismaMock.taskStatus.upsert.mockResolvedValue({ taskId: "T1", status: "Scheduled" });
  prismaMock.lookaheadEntry.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.lookaheadEntry.upsert.mockResolvedValue({ taskId: "T1", symbol: "X" });
  prismaMock.versionLog.create.mockResolvedValue({ id: "log-id" });
});

describe("project route write guards", () => {
  it("rejects status writes for task IDs outside the project", async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    const res = await postStatus(
      request({
        taskId: "missing",
        status: "Scheduled",
        confirmedComplete: false,
        inspectionRequired: false,
        inspectionPassed: false,
      }),
      context,
    );

    await expect(res.json()).resolves.toEqual({ error: "Task not found for project" });
    expect(res.status).toBe(404);
    expect(prismaMock.taskStatus.upsert).not.toHaveBeenCalled();
  });

  it("rejects lookahead writes for task IDs outside the project", async () => {
    prismaMock.task.findUnique.mockResolvedValue(null);

    const res = await postLookahead(request({ taskId: "missing", date: "2026-05-11", symbol: "X" }), context);

    await expect(res.json()).resolves.toEqual({ error: "Task not found for project" });
    expect(res.status).toBe(404);
    expect(prismaMock.lookaheadEntry.upsert).not.toHaveBeenCalled();
  });

  it("clears blank lookahead marks instead of storing empty symbols", async () => {
    const res = await postLookahead(request({ taskId: "T1", date: "2026-05-11", symbol: "" }), context);

    await expect(res.json()).resolves.toEqual({ entry: null, cleared: true });
    expect(res.status).toBe(200);
    expect(prismaMock.lookaheadEntry.deleteMany).toHaveBeenCalledWith({
      where: { projectId: "p1", taskId: "T1", date: new Date(2026, 4, 11) },
    });
    expect(prismaMock.lookaheadEntry.upsert).not.toHaveBeenCalled();
  });
});
