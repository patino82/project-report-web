import { NextRequest, NextResponse } from "next/server";
import { buildSummary } from "@/lib/domain";
import { loadProjectBundle } from "@/lib/project-data";
import { corsResponse, corsOptions } from "@/lib/cors";
import { requireAuth } from "@/lib/api-auth";

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const auth = await requireAuth(req);
  if (!auth.ok) return (auth as any).response;

  const { projectId } = await params;

  try {
    const bundle = await loadProjectBundle(projectId);
    if (!bundle) return corsResponse(req, NextResponse.json({ error: "Project not found" }, { status: 404 }));

    const summary = buildSummary({
      projectId,
      projectName: bundle.project.name,
      thisWeekStart: bundle.project.thisWeekStart.toISOString().slice(0, 10),
      tasks: bundle.taskLite,
      statuses: bundle.statusLite,
      contactsByCompany: bundle.contactsByCompany,
    });

    // Build mobile-compatible stats from the summary
    const tasks = bundle.taskLite || [];
    const statuses = bundle.statusLite || [];
    const statusMap = new Map(statuses.map((s: any) => [s.taskId, s.status]));

    let activeCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let inspectionCount = 0;
    const now = new Date();

    for (const t of tasks) {
      const s = statusMap.get(t.taskId) || "Scheduled";
      if (s === "Complete" || s === "completed") {
        completedCount++;
      } else {
        activeCount++;
        if ((t as any).endDate && new Date((t as any).endDate) < now) {
          overdueCount++;
        }
      }
    }

    for (const s of statuses) {
      if (s.inspectionRequired) inspectionCount++;
    }

    const mobileStats = {
      active: activeCount,
      completed: completedCount,
      overdue: overdueCount,
      inspections: inspectionCount,
      tasks: tasks.map((t: any) => ({
        taskId: t.taskId,
        taskName: t.taskName,
        status: statusMap.get(t.taskId) || "Scheduled",
        endDate: t.endDate,
        phase: t.phase,
        ownerCompany: t.ownerCompany,
      })),
    };

    return corsResponse(req, NextResponse.json({
      ...summary,
      stats: mobileStats,
      tasks: mobileStats.tasks,
    }));
  } catch (error) {
    console.error("[api/dashboard] error:", error);
    return corsResponse(req, NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 }));
  }
}
