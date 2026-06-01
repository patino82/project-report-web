import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let projects: Array<{
    id: string;
    name: string;
    thisWeekStart: Date;
    _count: { tasks: number; taskStatuses: number; lookahead: number };
  }> = [];
  let loadError: string | null = null;

  try {
    projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { tasks: true, taskStatuses: true, lookahead: true } },
      },
    });
  } catch (error) {
    loadError = `Unable to load portfolio: ${(error as Error).message}`;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <header className="tma-header">
        <p className="text-[10px] font-black text-primary tracking-[0.2em] mb-1">PORTFOLIO</p>
        <h1 className="text-3xl font-black tracking-tight text-ink">Dashboard</h1>
      </header>

      <section className="tma-card">
        <h2 className="tma-section-title">All Projects</h2>

        {loadError && (
          <div className="tma-card border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold text-center mb-4">
            {loadError}
          </div>
        )}

        <div className="tma-table-scroll">
          <table className="tma-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>This Week</th>
                <th>Tasks</th>
                <th>Statuses</th>
                <th>Lookahead</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {projects.length ? projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="tma-table-name">{p.name}</span>
                  </td>
                  <td>{p.thisWeekStart.toISOString().slice(0, 10)}</td>
                  <td>{p._count.tasks}</td>
                  <td>{p._count.taskStatuses}</td>
                  <td>{p._count.lookahead}</td>
                  <td>
                    <Link className="tma-button text-[0.65rem] py-2 px-4" href={`/projects/${p.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="text-center text-ink-muted py-8">
                    No projects found. Create a project to populate the portfolio.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
