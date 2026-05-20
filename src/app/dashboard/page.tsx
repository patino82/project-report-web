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
    <main className="app-shell">
      <div className="app-wrap space-y-4">
        <section className="app-card p-6">
          <h1 className="app-title text-3xl">Portfolio Dashboard</h1>
          <p className="text-sm text-slate-600">Central view of all active superintendent projects.</p>
        </section>

        <section className="app-card p-4 table-scroll">
          {loadError ? (
            <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {loadError}
            </div>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>This Week Start</th>
                <th>Tasks</th>
                <th>Status Rows</th>
                <th>Lookahead Marks</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {projects.length ? projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.thisWeekStart.toISOString().slice(0, 10)}</td>
                  <td>{p._count.tasks}</td>
                  <td>{p._count.taskStatuses}</td>
                  <td>{p._count.lookahead}</td>
                  <td>
                    <div className="action-row">
                      <Link className="btn btn-primary" href={`/projects/${p.id}`}>
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6}>No projects found. Create a project or import a workbook to populate the portfolio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
