import { describe, expect, it } from "vitest";
import {
  buildBossEmail,
  buildSummary,
  buildUnlock,
  computeTwoWeekDates,
  criticalPath,
  formatDateKey,
  isBeforeDateOnly,
  isEffectivelyComplete,
  parseDateKey,
  startOfWorkWeek,
  topologicalSort,
} from "./domain";
import { StatusLite, TaskLite } from "./types";

function task(overrides: Partial<TaskLite> & Pick<TaskLite, "taskId">): TaskLite {
  return {
    taskId: overrides.taskId,
    taskName: overrides.taskName ?? overrides.taskId,
    phase: overrides.phase ?? "Phase",
    trade: overrides.trade ?? null,
    ownerCompany: overrides.ownerCompany ?? "Superintendent",
    durationDays: overrides.durationDays ?? 1,
    predecessors: overrides.predecessors ?? [],
    requiresInspection: overrides.requiresInspection ?? false,
    callNow: overrides.callNow ?? false,
  };
}

function status(overrides: Partial<StatusLite> & Pick<StatusLite, "taskId">): StatusLite {
  return {
    taskId: overrides.taskId,
    status: overrides.status ?? "Scheduled",
    confirmedComplete: overrides.confirmedComplete ?? false,
    inspectionRequired: overrides.inspectionRequired ?? false,
    inspectionPassed: overrides.inspectionPassed ?? false,
    lastUpdated: overrides.lastUpdated ?? null,
  };
}

describe("domain completion rules", () => {
  it("requires confirmed completion and passed required inspections", () => {
    expect(isEffectivelyComplete(undefined)).toBe(false);
    expect(isEffectivelyComplete(status({ taskId: "A", confirmedComplete: true }))).toBe(true);
    expect(isEffectivelyComplete(status({ taskId: "A", confirmedComplete: true, inspectionRequired: true }))).toBe(false);
    expect(
      isEffectivelyComplete(status({ taskId: "A", confirmedComplete: true, inspectionRequired: true, inspectionPassed: true })),
    ).toBe(true);
  });

  it("unlocks tasks only after effective predecessor completion", () => {
    const tasks = [task({ taskId: "A" }), task({ taskId: "B", predecessors: ["A"] })];
    const blocked = buildUnlock(tasks, new Map([["A", status({ taskId: "A", confirmedComplete: true, inspectionRequired: true })]]));
    expect(blocked.find((item) => item.taskId === "B")).toMatchObject({ unlocked: false, blockedBy: ["A"] });

    const unlocked = buildUnlock(
      tasks,
      new Map([["A", status({ taskId: "A", confirmedComplete: true, inspectionRequired: true, inspectionPassed: true })]]),
    );
    expect(unlocked.find((item) => item.taskId === "B")).toMatchObject({ unlocked: true, blockedBy: [] });
  });
});

describe("domain dependency analysis", () => {
  it("sorts dependencies and rejects cycles", () => {
    expect(topologicalSort([task({ taskId: "A" }), task({ taskId: "B", predecessors: ["A"] })])).toEqual(["A", "B"]);
    expect(() => topologicalSort([task({ taskId: "A", predecessors: ["B"] }), task({ taskId: "B", predecessors: ["A"] })])).toThrow(
      "Cycle detected",
    );
  });

  it("finds the longest critical path by duration", () => {
    const result = criticalPath([
      task({ taskId: "A", durationDays: 2 }),
      task({ taskId: "B", durationDays: 8 }),
      task({ taskId: "C", durationDays: 3, predecessors: ["A"] }),
      task({ taskId: "D", durationDays: 4, predecessors: ["B"] }),
    ]);

    expect(result).toEqual({ path: ["B", "D"], totalDays: 12 });
  });
});

describe("domain summaries", () => {
  it("builds dashboard counts, contacts, and assistant actions", () => {
    const tasks = [
      task({ taskId: "A", callNow: true, ownerCompany: "SBC" }),
      task({ taskId: "B", predecessors: ["A"], requiresInspection: true, ownerCompany: "Inspector" }),
      task({ taskId: "C", taskName: "Gutter install", trade: "Gutters", predecessors: ["B"] }),
    ];
    const summary = buildSummary({
      projectId: "p1",
      projectName: "Project",
      thisWeekStart: "2026-05-11",
      tasks,
      statuses: [status({ taskId: "A", confirmedComplete: true })],
      contactsByCompany: new Map([["SBC", [{ company: "SBC", name: "Main Office", phone: "555-0100" }]]]),
    });

    expect(summary.effectiveComplete).toBe(1);
    expect(summary.unlocked).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.openInspectionCount).toBe(1);
    expect(summary.callNow).toBe(0);
    expect(summary.assistantActions).toContain("Inspection risk: 1 task(s) still need passed inspection.");
    expect(summary.assistantActions).toContain("Long-lead trade watch: 1 task(s) need early coordination.");
  });

  it("builds boss email with call-now contacts when present", () => {
    const body = buildBossEmail({
      projectName: "Craig F10",
      thisWeekStart: "2026-05-11",
      summary: {
        effectiveComplete: 2,
        blocked: 1,
        unlocked: 3,
        callNowDetails: [
          {
            taskId: "S01",
            taskName: "Site Prep",
            ownerCompany: "USA Siteworks",
            contacts: [{ company: "USA Siteworks", name: "Office", phone: "555-0101", email: "office@example.com" }],
          },
        ],
      },
    });

    expect(body).toContain("Subject: Craig F10 - Weekly Superintendent Update (2026-05-11)");
    expect(body).toContain("- S01 Site Prep | USA Siteworks | Office (555-0101) <office@example.com>");
    expect(body).toContain("Completion truth: task is only complete when Confirmed_Complete is Y");
  });
});

describe("domain calendar helpers", () => {
  it("builds a full 12-column lookahead window while skipping Sundays", () => {
    const dates = computeTwoWeekDates(new Date("2026-05-11T00:00:00"));

    expect(dates).toHaveLength(12);
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-05-11",
      "2026-05-12",
      "2026-05-13",
      "2026-05-14",
      "2026-05-15",
      "2026-05-16",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
    ]);
  });

  it("rolls dates to the Monday of the active work week", () => {
    expect(startOfWorkWeek(new Date("2026-05-14T15:30:00")).toISOString().slice(0, 10)).toBe("2026-05-11");
    expect(startOfWorkWeek(new Date("2026-05-17T12:00:00")).toISOString().slice(0, 10)).toBe("2026-05-11");
    expect(startOfWorkWeek(new Date("2026-05-18T08:00:00")).toISOString().slice(0, 10)).toBe("2026-05-18");
  });

  it("compares date-only values without time-of-day drift", () => {
    expect(isBeforeDateOnly(new Date("2026-02-09T23:59:00"), new Date("2026-05-11T00:00:00"))).toBe(true);
    expect(isBeforeDateOnly(new Date("2026-05-11T23:59:00"), new Date("2026-05-11T00:00:00"))).toBe(false);
  });

  it("parses date keys as local calendar days", () => {
    expect(formatDateKey(parseDateKey("2026-05-14"))).toBe("2026-05-14");
  });
});
