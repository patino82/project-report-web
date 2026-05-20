import { addDays, format } from "date-fns";
import { ContactLite, DashboardSummary, StatusLite, TaskLite, UnlockItem } from "@/lib/types";

export function isEffectivelyComplete(status: StatusLite | undefined): boolean {
  if (!status) return false;
  if (!status.confirmedComplete) return false;
  if (status.inspectionRequired && !status.inspectionPassed) return false;
  return true;
}

export function buildUnlock(tasks: TaskLite[], statusByTaskId: Map<string, StatusLite>): UnlockItem[] {
  return tasks.map((t) => {
    const blockedBy = t.predecessors.filter((p) => !isEffectivelyComplete(statusByTaskId.get(p)));
    const complete = isEffectivelyComplete(statusByTaskId.get(t.taskId));

    return {
      taskId: t.taskId,
      taskName: t.taskName,
      ownerCompany: t.ownerCompany,
      phase: t.phase,
      trade: t.trade,
      complete,
      unlocked: !complete && blockedBy.length === 0,
      blockedBy,
      callNow: t.callNow,
      requiresInspection: t.requiresInspection,
    };
  });
}

export function topologicalSort(tasks: TaskLite[]): string[] {
  const byId = new Map(tasks.map((t) => [t.taskId, t]));
  const indegree = new Map<string, number>();
  const succ = new Map<string, string[]>();

  for (const t of tasks) {
    indegree.set(t.taskId, 0);
    succ.set(t.taskId, []);
  }

  for (const t of tasks) {
    for (const p of t.predecessors) {
      if (!byId.has(p)) continue;
      succ.get(p)!.push(t.taskId);
      indegree.set(t.taskId, (indegree.get(t.taskId) ?? 0) + 1);
    }
  }

  const q: string[] = [];
  for (const [id, d] of indegree.entries()) {
    if (d === 0) q.push(id);
  }

  const out: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(id);
    for (const s of succ.get(id) ?? []) {
      const next = (indegree.get(s) ?? 0) - 1;
      indegree.set(s, next);
      if (next === 0) q.push(s);
    }
  }

  if (out.length !== tasks.length) {
    throw new Error("Cycle detected in task dependencies. Fix Sequence predecessors.");
  }

  return out;
}

export function criticalPath(tasks: TaskLite[]) {
  if (!tasks.length) return { path: [] as string[], totalDays: 0 };
  const byId = new Map(tasks.map((t) => [t.taskId, t]));
  const order = topologicalSort(tasks);

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const id of order) {
    dist.set(id, Number.NEGATIVE_INFINITY);
    prev.set(id, null);
  }

  for (const id of order) {
    const node = byId.get(id)!;
    if (node.predecessors.length === 0) {
      dist.set(id, Math.max(1, node.durationDays));
    }

    for (const nextId of order) {
      const next = byId.get(nextId)!;
      if (!next.predecessors.includes(id)) continue;
      const cand = (dist.get(id) ?? Number.NEGATIVE_INFINITY) + Math.max(1, next.durationDays);
      if (cand > (dist.get(nextId) ?? Number.NEGATIVE_INFINITY)) {
        dist.set(nextId, cand);
        prev.set(nextId, id);
      }
    }
  }

  let end = order[0];
  let max = dist.get(end) ?? 0;
  for (const id of order) {
    const v = dist.get(id) ?? 0;
    if (v > max) {
      max = v;
      end = id;
    }
  }

  const path: string[] = [];
  let cur: string | null = end;
  while (cur) {
    path.push(cur);
    cur = prev.get(cur) ?? null;
  }

  path.reverse();
  return { path, totalDays: max };
}

function criticalPathWithinDays(tasks: TaskLite[], maxDays: number) {
  const cp = criticalPath(tasks);
  const byId = new Map(tasks.map((t) => [t.taskId, t]));
  const windowPath: string[] = [];
  let total = 0;

  for (const id of cp.path) {
    const d = Math.max(1, byId.get(id)?.durationDays ?? 1);
    if (windowPath.length > 0 && total + d > maxDays) break;
    total += d;
    windowPath.push(id);
  }

  return { path: windowPath, totalDays: total };
}

function buildHealthScore(unlock: UnlockItem[], openInspectionCount: number): number {
  const total = unlock.length || 1;
  const completed = unlock.filter((u) => u.complete).length;
  const blocked = unlock.filter((u) => !u.complete && !u.unlocked).length;

  const completionPoints = (completed / total) * 70;
  const blockedPenalty = (blocked / total) * 20;
  const inspectionPenalty = Math.min(openInspectionCount * 2, 10);

  return Math.max(0, Math.min(100, Math.round(completionPoints + (30 - blockedPenalty - inspectionPenalty))));
}

export function assistantActions(tasks: TaskLite[], unlock: UnlockItem[], statuses: Map<string, StatusLite>): string[] {
  const items: string[] = [];
  const openInspectionTasks = tasks.filter((t) => t.requiresInspection && !statuses.get(t.taskId)?.inspectionPassed);
  const longTradeKeywords = ["shutter", "gutters", "gutter", "roll down", "screen", "lightning", "fireplace"];
  const longLeadTrades = unlock.filter((u) => {
    const text = `${u.taskName} ${u.trade ?? ""}`.toLowerCase();
    return !u.complete && longTradeKeywords.some((k) => text.includes(k));
  });

  if (openInspectionTasks.length > 0) {
    items.push(`Inspection risk: ${openInspectionTasks.length} task(s) still need passed inspection.`);
  }

  const callNow = unlock.filter((u) => u.callNow && !u.complete);
  if (callNow.length > 0) {
    items.push(`Call-now list: ${callNow.length} task(s). Confirm ETA before 3:00 PM cutoff.`);
  }

  const blocked = unlock.filter((u) => !u.complete && !u.unlocked);
  if (blocked.length > 0) {
    items.push(`Blockers: ${blocked.length} task(s) are blocked by predecessor completion.`);
  }

  const ready = unlock.filter((u) => !u.complete && u.unlocked);
  if (ready.length > 0) {
    items.push(`Field push: ${ready.length} unlocked task(s) ready to start now.`);
  }

  if (longLeadTrades.length > 0) {
    items.push(`Long-lead trade watch: ${longLeadTrades.length} task(s) need early coordination.`);
  }

  if (!items.length) items.push("No critical blockers detected. Maintain closeout pace and quality checks.");
  if (items.length < 2) items.push("Next focus: confirm two-day manpower and material readiness.");

  const maxItems = longLeadTrades.length > 0 ? 4 : 2;
  return items.slice(0, maxItems);
}

export function buildBossEmail(params: {
  projectName: string;
  thisWeekStart: string;
  summary: Pick<DashboardSummary, "effectiveComplete" | "blocked" | "unlocked" | "callNowDetails">;
}): string {
  const lines: string[] = [];
  lines.push(`Subject: ${params.projectName} - Weekly Superintendent Update (${params.thisWeekStart})`);
  lines.push("");
  lines.push(`Project: ${params.projectName}`);
  lines.push(`Week Start: ${params.thisWeekStart}`);
  lines.push(`Effective Complete: ${params.summary.effectiveComplete}`);
  lines.push(`Blocked: ${params.summary.blocked}`);
  lines.push(`Unlocked: ${params.summary.unlocked}`);
  lines.push("");

  if (params.summary.callNowDetails.length) {
    lines.push("Call-Now Items:");
    for (const item of params.summary.callNowDetails) {
      const contacts = item.contacts.length
        ? item.contacts
            .map((c) => `${c.name}${c.phone ? ` (${c.phone})` : ""}${c.email ? ` <${c.email}>` : ""}`)
            .join("; ")
        : "No contact on file";
      lines.push(`- ${item.taskId} ${item.taskName} | ${item.ownerCompany} | ${contacts}`);
    }
    lines.push("");
  }

  lines.push("Reminder: Inspection call cutoff is 3:00 PM.");
  lines.push("Completion truth: task is only complete when Confirmed_Complete is Y and required inspections are passed.");

  return lines.join("\n");
}

export function buildSummary(params: {
  projectId: string;
  projectName: string;
  thisWeekStart: string;
  tasks: TaskLite[];
  statuses: StatusLite[];
  contactsByCompany?: Map<string, ContactLite[]>;
}): DashboardSummary {
  const statusMap = new Map(params.statuses.map((s) => [s.taskId, s]));
  const unlock = buildUnlock(params.tasks, statusMap);
  const cp30 = criticalPathWithinDays(params.tasks, 30);

  const openInspectionCount = params.tasks.filter((t) => t.requiresInspection && !statusMap.get(t.taskId)?.inspectionPassed).length;
  const callNowDetails = unlock
    .filter((u) => u.callNow && !u.complete)
    .map((u) => ({
      taskId: u.taskId,
      taskName: u.taskName,
      ownerCompany: u.ownerCompany,
      contacts: params.contactsByCompany?.get(u.ownerCompany) ?? [],
    }));

  return {
    projectId: params.projectId,
    projectName: params.projectName,
    thisWeekStart: params.thisWeekStart,
    effectiveComplete: unlock.filter((u) => u.complete).length,
    totalTasks: params.tasks.length,
    unlocked: unlock.filter((u) => !u.complete && u.unlocked).length,
    blocked: unlock.filter((u) => !u.complete && !u.unlocked).length,
    callNow: callNowDetails.length,
    openInspectionCount,
    healthScore: buildHealthScore(unlock, openInspectionCount),
    criticalPathTaskIds: cp30.path,
    criticalPathDays: cp30.totalDays,
    callNowDetails,
    assistantActions: assistantActions(params.tasks, unlock, statusMap),
  };
}

export function computeTwoWeekDates(thisWeekStart: Date): Date[] {
  const dates: Date[] = [];
  const total = 12;
  for (let i = 0; dates.length < total && i < 21; i += 1) {
    const d = addDays(thisWeekStart, i);
    const dow = d.getDay();
    if (dow === 0) {
      continue;
    }
    dates.push(d);
  }
  return dates;
}

export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function startOfWorkWeek(date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

export function isBeforeDateOnly(left: Date, right: Date): boolean {
  return formatDateKey(left) < formatDateKey(right);
}
