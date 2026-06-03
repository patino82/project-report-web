import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Settings } from "lucide-react";
import { buildBossEmail, buildSummary, buildUnlock } from "@/lib/domain";
import { loadProjectBundle } from "@/lib/project-data";
import { BossLookaheadButton } from "@/components/boss-lookahead-button";
import { ThemeBrandMark } from "@/components/theme-brand";
import { WorkbookDownloadButton } from "@/components/workbook-download-button";
import { getAmplitudeClient, flushAmplitude } from "@/lib/amplitude-server";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const bundle = await loadProjectBundle(projectId);
  if (!bundle) notFound();

  const amp = getAmplitudeClient();
  if (amp) {
    amp.track("Project Opened", {
      project_id: projectId,
      project_name: bundle.project.name,
      structure_type: bundle.project.structureType,
      scope_type: bundle.project.scopeType,
    });
    void flushAmplitude();
  }

  const summary = buildSummary({
    projectId,
    projectName: bundle.project.name,
    thisWeekStart: bundle.project.thisWeekStart.toISOString().slice(0, 10),
    tasks: bundle.taskLite,
    statuses: bundle.statusLite,
    contactsByCompany: bundle.contactsByCompany,
  });

  const bossEmail = buildBossEmail({
    projectName: summary.projectName,
    thisWeekStart: summary.thisWeekStart,
    summary,
  });
  const statusMap = new Map(bundle.statusLite.map((status) => [status.taskId, status]));
  const unlock = buildUnlock(bundle.taskLite, statusMap);
  const readyWork = unlock.filter((item) => !item.complete && item.unlocked).slice(0, 6);
  const blockedWork = unlock.filter((item) => !item.complete && !item.unlocked).slice(0, 4);
  const criticalTasks = summary.criticalPathTaskIds
    .map((taskId) => bundle.taskLite.find((task) => task.taskId === taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task))
    .slice(0, 6);

  return (
    <div className="tma-project-layout">
      <CommandTopBar projectId={projectId} />
      <FieldRail projectId={projectId} />

      <main className="tma-project-main">
        <section className="tma-hero tma-card">
          <div>
            <p className="tma-date-chip">{summary.thisWeekStart}</p>
            <h1 className="tma-hero-title">{summary.projectName}</h1>
            <p className="tma-hero-meta">
              {bundle.project.preparedBy || "Unassigned"} / {formatName(bundle.project.structureType)} / {formatName(bundle.project.scopeType)}
            </p>
            <p className="tma-hero-note">Daily decisions first. Project controls, workbook tools, and run detail stay close without taking over the board.</p>

            <div className="tma-mode-panel">
              <div>
                <strong>Project mode</strong>
                <span>Active keeps field actions live and hides setup-only noise.</span>
              </div>
              <div className="tma-segmented" aria-label="Project mode">
                <span className="is-active">Active</span>
                <Link href={`/projects/${projectId}/assistant`}>Setup</Link>
              </div>
            </div>
          </div>

          <div className="tma-metrics" aria-label="Project health metrics">
            <CommandMetric title="Readiness" value={`${summary.healthScore}%`} emphasis />
            <CommandMetric title="Near-Term Blockers" value={String(summary.blocked)} />
            <CommandMetric title="Callbacks Due" value={String(summary.callNow)} />
            <CommandMetric title="Inspections" value={String(summary.openInspectionCount)} />
          </div>
        </section>

        <section className="tma-section">
          <div className="tma-section-header">
            <div>
              <h2>Action Queue</h2>
              <p>Priority items that need attention before the rest of the board matters.</p>
            </div>
            <div className="tma-live-count">
              <strong>{summary.assistantActions.length}</strong>
              <span>live</span>
            </div>
          </div>

          <div className="tma-action-grid">
            {summary.assistantActions.map((action) => (
              <ActionCard key={action} text={action} />
            ))}
          </div>
        </section>

        <section className="tma-panel-grid">
          <Panel title="Next Scheduled Work" count={readyWork.length ? `${readyWork.length} visible` : "clear"}>
            <p className="tma-panel-subcopy">Critical-path work sits on top. The lead item gets the strongest signal.</p>
            <div className="tma-task-stack">
              {readyWork.length ? readyWork.map((task, index) => (
                <TaskLine key={task.taskId} label={task.taskName} meta={`${task.ownerCompany} / ${task.phase ?? "Field"}`} hot={index === 0} />
              )) : <p className="tma-panel-subcopy" style={{ textAlign: "center", padding: "1.5rem 0" }}>No unlocked tasks are waiting right now.</p>}
            </div>
          </Panel>

          <Panel title="4-Week Calls" count={`${summary.callNow} tracked`}>
            <p className="tma-panel-subcopy">Defaults stay at 14 days, then tighten to 72h / 48h / 24h as work approaches.</p>
            <div className="tma-task-stack">
              {summary.callNowDetails.length ? summary.callNowDetails.slice(0, 5).map((item) => (
                <TaskLine
                  key={item.taskId}
                  label={item.taskName}
                  meta={`${item.ownerCompany} / ${item.contacts[0]?.phone ?? "contact needed"}`}
                />
              )) : <p className="tma-panel-subcopy" style={{ textAlign: "center", padding: "1.5rem 0" }}>No call-now items are active.</p>}
            </div>
          </Panel>

          <Panel title="Critical Path" count={`${summary.criticalPathDays} days`}>
            <p className="tma-panel-subcopy">The path is calculated from predecessor logic and duration, then trimmed to the next 30 days.</p>
            <div className="tma-task-stack">
              {criticalTasks.length ? criticalTasks.map((task, index) => (
                <TaskLine key={task.taskId} label={task.taskName} meta={`${task.taskId} / ${task.ownerCompany}`} hot={index === 0} />
              )) : <p className="tma-panel-subcopy" style={{ textAlign: "center", padding: "1.5rem 0" }}>No critical path tasks found.</p>}
            </div>
          </Panel>

          <Panel title="Blocked Work" count={String(blockedWork.length)}>
            <p className="tma-panel-subcopy">Blocked items need predecessor truth cleaned up before field crews can move.</p>
            <div className="tma-task-stack">
              {blockedWork.length ? blockedWork.map((task) => (
                <TaskLine key={task.taskId} label={task.taskName} meta={`Waiting on ${task.blockedBy.join(", ")}`} />
              )) : <p className="tma-panel-subcopy" style={{ textAlign: "center", padding: "1.5rem 0" }}>No blockers in the first visible slice.</p>}
            </div>
          </Panel>
        </section>

        <section className="tma-section" id="tools">
          <div className="tma-section-header">
            <div>
              <h2>2-Week & Workbook</h2>
              <p>Export, print, and operations controls stay one tap away from the field board.</p>
            </div>
            <div className="tma-tools-row">
              <Link className="tma-button text-[0.65rem] py-2 px-4" href={`/projects/${projectId}/lookahead`}>Open 2-Week</Link>
              <Link className="tma-button-secondary text-[0.65rem] py-2 px-4" href={`/projects/${projectId}/assistant`}>Operations</Link>
              <BossLookaheadButton projectId={projectId} />
              <WorkbookDownloadButton projectId={projectId} />
            </div>
          </div>
        </section>

        <section className="tma-section">
          <div className="tma-section-header">
            <div>
              <h2>Boss Email Draft</h2>
              <p>Generated from the same project truth that drives the command board.</p>
            </div>
          </div>
          <textarea className="tma-email-textarea" rows={10} readOnly value={bossEmail} />
        </section>
      </main>
    </div>
  );
}

function CommandTopBar({ projectId }: { projectId: string }) {
  return (
    <header className="tma-topbar">
      <Link className="tma-button-secondary text-[0.65rem] py-2 px-3" href="/">Menu</Link>
      <Link href="/" aria-label="Project Lookahead home">
        <ThemeBrandMark />
      </Link>
      <nav className="tma-segmented" aria-label="Primary">
        <Link className="active" href={`/projects/${projectId}`}>Hub</Link>
        <Link href={`/projects/${projectId}/lookahead`}>Planner</Link>
        <Link href={`/projects/${projectId}/assistant`}>Runbook</Link>
      </nav>
      <div className="tma-search-placeholder">Search jobs, tasks, subs</div>
      <div className="tma-weather"><span /> Clear 79F / 5 mph</div>
      <Link className="tma-icon-button" href="/settings" aria-label="Theme settings" title="Theme settings">
        <Settings className="h-4 w-4" />
      </Link>
      <Link className="tma-button text-[0.65rem] py-2 px-4" href={`/projects/${projectId}/lookahead`}>2-Week & Workbook</Link>
      <div className="tma-user-chip">Dave</div>
    </header>
  );
}

function FieldRail({ projectId }: { projectId: string }) {
  const links = [
    { label: "Home", href: `/projects/${projectId}` },
    { label: "2-Week", href: `/projects/${projectId}/lookahead` },
    { label: "Ops", href: `/projects/${projectId}/assistant` },
    { label: "Portfolio", href: "/dashboard" },
  ];

  return (
    <aside className="tma-project-rail" aria-label="Project shortcuts">
      {links.map((link) => (
        <Link key={link.label} href={link.href}>{link.label}</Link>
      ))}
    </aside>
  );
}

function CommandMetric({ title, value, emphasis = false }: { title: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? `tma-metric tma-metric-warn` : "tma-metric"}>
      <span className="tma-metric-label">{title}</span>
      <span className="tma-metric-value">{value}</span>
    </div>
  );
}

function ActionCard({ text }: { text: string }) {
  const lower = text.toLowerCase();
  const tone = lower.includes("inspection") ? "risk" : lower.includes("call") ? "call" : lower.includes("block") ? "blocked" : lower.includes("long-lead") ? "watch" : "push";
  const label = tone === "risk" ? "Inspection Risk" : tone === "call" ? "Call Schedule" : tone === "blocked" ? "Blocked Work" : tone === "watch" ? "Trade Watch" : "Field Push";

  return (
    <article className={`tma-action-card ${tone}`}>
      <span>{label}</span>
      <p>{text.replace(/^.*?:\s*/, "")}</p>
      <Link href="#tools">Open</Link>
    </article>
  );
}

function Panel({ title, count, children }: { title: string; count: string; children: ReactNode }) {
  return (
    <section className="tma-card">
      <div className="tma-panel-title">
        <h2>{title}</h2>
        <span>{count}</span>
      </div>
      {children}
    </section>
  );
}

function TaskLine({ label, meta, hot = false }: { label: string; meta: string; hot?: boolean }) {
  return (
    <div className={hot ? "tma-task-line tma-task-line-hot" : "tma-task-line"}>
      <strong>{label}</strong>
      <span>{meta}</span>
    </div>
  );
}

function formatName(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
