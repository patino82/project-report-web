import { prisma } from "@/lib/prisma";
import { ensureProjectCalendarCurrent } from "@/lib/project-calendar";
import { ContactLite, StatusLite, TaskLite } from "@/lib/types";

export async function loadProjectBundle(projectId: string) {
  const projectRecord = await prisma.project.findUnique({ where: { id: projectId } });
  if (!projectRecord) return null;
  const project = await ensureProjectCalendarCurrent(projectRecord);

  const [tasks, deps, statuses, contacts] = await Promise.all([
    prisma.task.findMany({ where: { projectId }, orderBy: [{ phase: "asc" }, { taskId: "asc" }] }),
    prisma.dependency.findMany({ where: { projectId } }),
    prisma.taskStatus.findMany({ where: { projectId }, orderBy: { taskId: "asc" } }),
    prisma.contact.findMany({ include: { company: true }, orderBy: [{ company: { name: "asc" } }, { isPrimary: "desc" }, { name: "asc" }] }),
  ]);

  const predecessorsByTask = new Map<string, string[]>();
  for (const d of deps) {
    const arr = predecessorsByTask.get(d.toTaskId) ?? [];
    arr.push(d.fromTaskId);
    predecessorsByTask.set(d.toTaskId, arr);
  }

  const taskLite: TaskLite[] = tasks.map((t) => ({
    taskId: t.taskId,
    taskName: t.taskName,
    phase: t.phase,
    trade: t.trade,
    ownerCompany: t.ownerCompany,
    durationDays: t.durationDays,
    predecessors: predecessorsByTask.get(t.taskId) ?? [],
    requiresInspection: t.requiresInspection,
    callNow: t.callNow,
  }));

  const statusLite: StatusLite[] = statuses.map((s) => ({
    taskId: s.taskId,
    status: s.status,
    confirmedComplete: s.confirmedComplete,
    inspectionRequired: s.inspectionRequired,
    inspectionPassed: s.inspectionPassed,
    lastUpdated: s.lastUpdated ? s.lastUpdated.toISOString().slice(0, 10) : null,
  }));

  const contactsByCompany = new Map<string, ContactLite[]>();
  for (const c of contacts) {
    const key = c.company.name;
    const row: ContactLite = {
      company: key,
      name: c.name,
      phone: c.phone,
      email: c.email,
      role: c.role,
      isPrimary: c.isPrimary,
    };
    const arr = contactsByCompany.get(key) ?? [];
    arr.push(row);
    contactsByCompany.set(key, arr);
  }

  return {
    project,
    tasks,
    deps,
    statuses,
    taskLite,
    statusLite,
    contactsByCompany,
  };
}
