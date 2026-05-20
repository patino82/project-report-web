import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CreateProjectForm } from "@/components/create-project-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: Array<{ id: string; name: string; thisWeekStart: Date; structureType: string; scopeType: string }> = [];
  let loadError: string | null = null;

  try {
    projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, thisWeekStart: true, structureType: true, scopeType: true },
      take: 20,
    });
  } catch (error) {
    loadError = `Unable to load projects: ${(error as Error).message}`;
  }

  return (
    <main className="app-shell">
      <div className="app-wrap space-y-5">
        <section className="app-card hero-pop p-6">
          <p className="pill inline-block mb-3">Superintendent Command Center</p>
          <h1 className="app-title text-4xl">Project Report Web Assistant</h1>
          <p className="mt-2 text-sm">Create a project, import real workbook data, and open the project workspace from one list.</p>
        </section>

        <CreateProjectForm />

        <section className="app-card p-4 table-scroll">
          <div className="section-toolbar">
            <h2 className="app-title text-2xl section-heading">Projects</h2>
            <Link href="/dashboard" className="btn btn-secondary">Portfolio</Link>
          </div>
          {loadError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {loadError}
            </div>
          ) : null}
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Type</th>
                <th>This Week Start</th>
                <th>Open</th>
              </tr>
            </thead>
            <tbody>
              {projects.length ? projects.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.structureType} / {p.scopeType}</td>
                  <td>{p.thisWeekStart.toISOString().slice(0, 10)}</td>
                  <td>
                    <div className="action-row">
                      <Link href={`/projects/${p.id}`} className="btn btn-primary">Open</Link>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4}>No projects found. Create a project or import a workbook to begin.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
