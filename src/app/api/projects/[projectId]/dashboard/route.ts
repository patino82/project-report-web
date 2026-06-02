import { NextRequest, NextResponse } from "next/server";
import { buildSummary } from "@/lib/domain";
import { loadProjectBundle } from "@/lib/project-data";
import { corsResponse, corsOptions } from "@/lib/cors";

export async function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
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

    return corsResponse(req, NextResponse.json(summary));
  } catch (error) {
    return corsResponse(req, NextResponse.json({ error: `Failed to load dashboard: ${(error as Error).message}` }, { status: 500 }));
  }
}
