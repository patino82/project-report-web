import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProjectBundle } from "@/lib/project-data";
import { computeTwoWeekDates, formatDateKey } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { LookaheadGrid } from "@/components/lookahead-grid";

export const dynamic = "force-dynamic";

export default async function LookaheadPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const bundle = await loadProjectBundle(projectId);
  if (!bundle) notFound();

  const dates = computeTwoWeekDates(bundle.project.thisWeekStart);
  const entries = await prisma.lookaheadEntry.findMany({
    where: { projectId, date: { gte: dates[0], lte: dates[dates.length - 1] } },
  });

  const symbolMap = new Map(entries.map((e) => [`${e.taskId}|${formatDateKey(e.date)}`, e.symbol]));
  const rows = bundle.taskLite.map((t) => ({
    taskId: t.taskId,
    taskName: t.taskName,
    phase: t.phase,
    trade: t.trade,
    ownerCompany: t.ownerCompany,
    days: dates.map((d) => {
      const date = formatDateKey(d);
      return {
        date,
        label: `${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getMonth() + 1}/${d.getDate()}`,
        symbol: symbolMap.get(`${t.taskId}|${date}`) ?? "",
      };
    }),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="tma-card mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="tma-date-chip">{bundle.project.thisWeekStart.toISOString().slice(0, 10)}</p>
            <h1 className="text-2xl font-black tracking-tight text-ink">2-Week Lookahead</h1>
            <p className="text-sm text-ink-muted mt-1">{bundle.project.name} field plan, broken into phases.</p>
          </div>
          <Link className="tma-button-secondary text-[0.65rem] py-2 px-4" href={`/projects/${projectId}`}>
            Back to Hub
          </Link>
        </div>
      </div>

      <LookaheadGrid projectId={projectId} rows={rows} />
    </div>
  );
}
