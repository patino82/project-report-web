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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="tma-header">
        <h1 className="text-2xl font-black tracking-tight text-ink">Operations Console</h1>
        <p className="text-sm text-ink-muted mt-1">Update status truth, track inspections, and manage partners.</p>
        <div className="mt-3">
          <Link className="tma-button-secondary text-[0.65rem] py-2 px-4" href={`/projects/${projectId}`}>
            Back to Project
          </Link>
        </div>
      </header>

      <section className="tma-card">
        <h2 className="tma-section-title">Top Priorities</h2>
        <div className="space-y-2">
          {summary.assistantActions.map((a) => (
            <div key={a} className="tma-card-inner text-sm text-ink-dim">
              {a}
            </div>
          ))}
          {!summary.assistantActions.length && (
            <p className="text-ink-muted text-sm">No priority actions right now.</p>
          )}
        </div>
      </section>

      <TemplateApplier projectId={projectId} />
      <StatusBoard projectId={projectId} rows={statusRows} />
      <PartnersManager companies={companies} />
    </div>
  );
}
