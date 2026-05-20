import { NextRequest, NextResponse } from "next/server";
import { buildBossEmail, buildSummary } from "@/lib/domain";
import { loadProjectBundle } from "@/lib/project-data";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  try {
    const bundle = await loadProjectBundle(projectId);
    if (!bundle) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const summary = buildSummary({
      projectId,
      projectName: bundle.project.name,
      thisWeekStart: bundle.project.thisWeekStart.toISOString().slice(0, 10),
      tasks: bundle.taskLite,
      statuses: bundle.statusLite,
      contactsByCompany: bundle.contactsByCompany,
    });

    const body = buildBossEmail({
      projectName: summary.projectName,
      thisWeekStart: summary.thisWeekStart,
      summary,
    });

    return NextResponse.json({ body, summary });
  } catch (error) {
    return NextResponse.json({ error: `Failed to generate boss email: ${(error as Error).message}` }, { status: 500 });
  }
}
