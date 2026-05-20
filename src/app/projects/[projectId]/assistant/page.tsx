import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loadProjectBundle } from "@/lib/project-data";
import { buildSummary } from "@/lib/domain";
import { StatusBoard } from "@/components/status-board";
import { PartnersManager } from "@/components/partners-manager";
import { TemplateApplier } from "@/components/template-applier";

export const dynamic = "force-dynamic";

export default async function AssistantPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const bundle = await loadProjectBundle(projectId);
  if (!bundle) notFound();

  const summary = buildSummary({
    projectId,
    projectName: bundle.project.name,
    thisWeekStart: bundle.project.thisWeekStart.toISOString().slice(0, 10),
    tasks: bundle.taskLite,
    statuses: bundle.statusLite,
    contactsByCompany: bundle.contactsByCompany,
  });

  const companies = await prisma.company.findMany({
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      trades: { include: { trade: true } },
    },
    orderBy: { name: "asc" },
  });

  const statusMap = new Map(bundle.statuses.map((s) => [s.taskId, s]));
  const statusRows = bundle.tasks.map((t) => {
    const s = statusMap.get(t.taskId);
    return {
      taskId: t.taskId,
      taskName: t.taskName,
      phase: t.phase,
      ownerCompany: t.ownerCompany,
      requiresInspection: t.requiresInspection,
      status: s?.status ?? "Scheduled",
      confirmedComplete: s?.confirmedComplete ?? false,
      inspectionRequired: s?.inspectionRequired ?? t.requiresInspection,
      inspectionPassed: s?.inspectionPassed ?? false,
    };
  });

  return (
    <main className="app-shell">
      <div className="app-wrap space-y-4">
        <section className="app-card p-6">
          <h1 className="app-title text-3xl">Assistant Operations Console</h1>
          <p className="text-sm text-slate-600">Daily actions: update status truth, track inspections, and keep partner contact network complete.</p>
          <div className="action-row mt-3">
            <Link href={`/projects/${projectId}`} className="btn btn-secondary">Back to Project</Link>
          </div>
        </section>

        <section className="app-card p-4">
          <h2 className="app-title text-2xl">Top Priorities</h2>
          <ul className="list-disc pl-5 mt-2 text-sm">
            {summary.assistantActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>

        <TemplateApplier projectId={projectId} />
        <StatusBoard projectId={projectId} rows={statusRows} />
        <PartnersManager companies={companies} />
      </div>
    </main>
  );
}
