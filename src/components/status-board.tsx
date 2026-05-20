"use client";

import { useState } from "react";

type TaskStatusRow = {
  taskId: string;
  taskName: string;
  phase?: string | null;
  ownerCompany: string;
  requiresInspection: boolean;
  status: string;
  confirmedComplete: boolean;
  inspectionRequired: boolean;
  inspectionPassed: boolean;
};

export function StatusBoard({ projectId, rows }: { projectId: string; rows: TaskStatusRow[] }) {
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState("");

  async function save(row: TaskStatusRow) {
    setBusy(row.taskId);
    setMessage("");
    try {
      const res = await fetch(`/api/projects/${projectId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: row.taskId,
          status: row.status,
          confirmedComplete: row.confirmedComplete,
          inspectionRequired: row.inspectionRequired,
          inspectionPassed: row.inspectionPassed,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save status");
      }
      const timestamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setSavedAt(timestamp);
      setMessage(`Saved ${row.taskId} at ${timestamp}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save status");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="app-card p-4 table-scroll">
      <h3 className="app-title text-xl mb-3">Task Status Board</h3>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <p>{message || "Update the real task status rows for this project."}</p>
        {savedAt ? <span className="pill">Last save {savedAt}</span> : null}
      </div>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Company</th>
            <th>Status</th>
            <th>Confirmed Complete</th>
            <th>Inspection Req</th>
            <th>Inspection Passed</th>
            <th>Save</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <StatusRow key={r.taskId} projectId={projectId} row={r} busy={busy === r.taskId} onSave={save} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusRow({
  row,
  busy,
  onSave,
}: {
  projectId: string;
  row: TaskStatusRow;
  busy: boolean;
  onSave: (row: TaskStatusRow) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TaskStatusRow>(row);

  return (
    <tr>
      <td>
        <div className="font-medium">{draft.taskName}</div>
        <small>{draft.taskId}</small>
      </td>
      <td>{draft.ownerCompany}</td>
      <td>
        <input value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} />
      </td>
      <td>
        <input
          type="checkbox"
          checked={draft.confirmedComplete}
          onChange={(e) => setDraft({ ...draft, confirmedComplete: e.target.checked })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={draft.inspectionRequired}
          onChange={(e) => setDraft({ ...draft, inspectionRequired: e.target.checked })}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={draft.inspectionPassed}
          onChange={(e) => setDraft({ ...draft, inspectionPassed: e.target.checked })}
        />
      </td>
      <td>
        <button className="btn btn-secondary" onClick={() => onSave(draft)} disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
      </td>
    </tr>
  );
}
