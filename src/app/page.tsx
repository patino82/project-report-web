import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CreateProjectForm } from "@/components/create-project-form";
import { Activity, Zap, ChevronRight, LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: Array<{ id: string; name: string; status: string; location?: string | null }> = [];
  let loadError: string | null = null;

  try {
    projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, location: true },
      take: 10,
    });
  } catch (error) {
    loadError = "Operational connection lost.";
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="tma-header">
        <p className="text-[10px] font-black text-primary tracking-[0.2em] mb-1">COMMAND CENTER</p>
        <h1 className="text-3xl font-black tracking-tight text-ink">Mission Control</h1>
      </header>

      <div className="px-6 py-6 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[12px] font-black text-ink-muted uppercase tracking-widest">Active Missions</h2>
            <Link href="/dashboard" className="text-[10px] font-black text-primary uppercase">Portfolio</Link>
          </div>

          {loadError && (
            <div className="tma-card border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold text-center">
              {loadError}
            </div>
          )}

          <div className="space-y-3">
            {projects.length ? projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block active:scale-[0.98] transition-transform">
                <div className="tma-card hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-[16px] bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-ink uppercase tracking-wide truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                        <span className="text-[9px] font-black text-ink-muted uppercase tracking-widest">{p.status || 'Active'}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-muted" />
                  </div>
                </div>
              </Link>
            )) : (
              <div className="tma-card border-dashed flex flex-col items-center justify-center py-12 text-center">
                <LayoutGrid className="w-12 h-12 text-ink-muted mb-4" strokeWidth={1} />
                <p className="text-ink font-black uppercase text-sm tracking-wide">Zero Active Missions</p>
                <p className="text-ink-muted text-xs mt-2 px-8">Deploy a project sequence in Notion to populate this field list.</p>
              </div>
            )}
          </div>
        </section>

        <section className="pt-4">
          <div className="px-2 mb-4">
            <h2 className="text-[12px] font-black text-ink-muted uppercase tracking-widest">Deploy New Mission</h2>
          </div>
          <div className="tma-card bg-white/[0.03]">
            <CreateProjectForm />
          </div>
        </section>
      </div>

      <footer className="mt-auto py-12 px-6 text-center">
        <p className="text-[10px] font-black text-ink-muted uppercase tracking-[0.3em] opacity-60">
          Protected by Bespoke Services Intelligence
        </p>
      </footer>
    </div>
  );
}
