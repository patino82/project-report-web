"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import * as amplitude from "@amplitude/unified";

type MatrixRow = {
  taskId: string;
  taskName: string;
  phase?: string | null;
  trade?: string | null;
  ownerCompany: string;
  days: Array<{ date: string; label: string; symbol: string }>;
};

const symbolOptions = [
  { value: "/", label: "Scheduled", short: "/" },
  { value: "X", label: "Worked", short: "X" },
  { value: "!", label: "Inspection", short: "!" },
  { value: "0", label: "Behind", short: "0" },
  { value: "", label: "Clear", short: "Clear" },
];

function buildMarkMap(rows: MatrixRow[]) {
  const map = new Map<string, string>();
  for (const row of rows) {
    for (const day of row.days) {
      map.set(`${row.taskId}|${day.date}`, day.symbol);
    }
  }
  return map;
}

export function LookaheadGrid({ projectId, rows }: { projectId: string; rows: MatrixRow[] }) {
  const [working, setWorking] = useState<string>("");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("/");
  const [marks, setMarks] = useState(() => buildMarkMap(rows));
  const grouped = useMemo(() => {
    const map = new Map<string, MatrixRow[]>();
    for (const r of rows) {
      const key = r.phase || "Unphased";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [rows]);
  const [activePhase, setActivePhase] = useState(grouped[0]?.[0] ?? "");
  const activeRows = grouped.find(([phase]) => phase === activePhase)?.[1] ?? grouped[0]?.[1] ?? [];
  const activePhaseName = grouped.find(([phase]) => phase === activePhase)?.[0] ?? grouped[0]?.[0] ?? "Phase";
  const activePhaseIndex = Math.max(0, grouped.findIndex(([phase]) => phase === activePhase));
  const dates = activeRows[0]?.days ?? [];
  const phaseMarkedCount = activeRows.reduce((count, row) => count + row.days.filter((day) => marks.get(`${row.taskId}|${day.date}`)).length, 0);

  useEffect(() => {
    setMarks(buildMarkMap(rows));
  }, [rows]);

  useEffect(() => {
    if (!grouped.length) {
      setActivePhase("");
      return;
    }
    if (!grouped.some(([phase]) => phase === activePhase)) {
      setActivePhase(grouped[0][0]);
    }
  }, [activePhase, grouped]);

  async function save(taskId: string, date: string, symbol: string) {
    const key = `${taskId}|${date}`;
    const previous = marks.get(key) ?? "";
    if (previous === symbol) return;

    setWorking(key);
    setMessage("");
    setMarks((current) => new Map(current).set(key, symbol));
    try {
      const res = await fetch(`/api/projects/${projectId}/lookahead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date, symbol }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save lookahead mark");
      }
      const timestamp = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      amplitude.track("Lookahead Mark Saved", {
        project_id: projectId,
        task_id: taskId,
        date,
        symbol: symbol || "cleared",
      });
      setSavedAt(timestamp);
      setMessage(symbol ? `Lookahead updated at ${timestamp}.` : `Lookahead mark cleared at ${timestamp}.`);
    } catch (error) {
      setMarks((current) => new Map(current).set(key, previous));
      setMessage(error instanceof Error ? error.message : "Failed to save lookahead mark");
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="tma-lookahead">
      <section className="tma-lookahead-controls">
        <div className="tma-lookahead-status">
          <span>{grouped.length} phases</span>
          <p>{message || "Pick a mark, then tap the dates that need it. Every tap saves immediately."}</p>
          {savedAt ? <strong>Last save {savedAt}</strong> : null}
        </div>

        <div className="tma-mark-palette" aria-label="Lookahead mark palette">
          {symbolOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              className={selectedSymbol === option.value ? "tma-mark-choice tma-mark-choice-active" : "tma-mark-choice"}
              onClick={() => setSelectedSymbol(option.value)}
            >
              <span>{option.short}</span>
              <small>{option.label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="tma-phase-nav" aria-label="Project phases">
        {grouped.map(([phase, phaseRows], index) => {
          const marked = phaseRows.reduce((count, row) => count + row.days.filter((day) => marks.get(`${row.taskId}|${day.date}`)).length, 0);
          return (
            <button
              key={phase}
              type="button"
              className={phase === activePhaseName ? "tma-phase-tab-active" : "tma-phase-tab"}
              onClick={() => setActivePhase(phase)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{phase}</strong>
              <small>{phaseRows.length} tasks / {marked} marks</small>
            </button>
          );
        })}
      </section>

      <section className="tma-phase-board">
        <div className="tma-phase-board-header">
          <div>
            <span>Phase {activePhaseIndex + 1} of {grouped.length}</span>
            <h2>{activePhaseName}</h2>
            <p>{activeRows.length} task(s), {phaseMarkedCount} active date mark(s).</p>
          </div>
          <div className="tma-phase-stepper">
            <button
              type="button"
              disabled={activePhaseIndex <= 0}
              onClick={() => setActivePhase(grouped[activePhaseIndex - 1]?.[0] ?? activePhaseName)}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={activePhaseIndex >= grouped.length - 1}
              onClick={() => setActivePhase(grouped[activePhaseIndex + 1]?.[0] ?? activePhaseName)}
            >
              Next Phase
            </button>
          </div>
        </div>

        <div className="tma-lookahead-grid-scroll">
          <div className="tma-lookahead-date-grid" style={{ "--day-count": dates.length } as CSSProperties}>
            <div className="tma-grid-corner">Task / Company</div>
            {dates.map((day) => (
              <div key={day.date} className="tma-date-heading">
                <strong>{day.label.split(" ")[0]}</strong>
                <span>{day.label.split(" ")[1]}</span>
              </div>
            ))}

            {activeRows.map((row) => (
              <div key={row.taskId} className="tma-lookahead-row">
                <div className="tma-task-anchor">
                  <strong>{row.taskName}</strong>
                  <span>{row.ownerCompany}</span>
                  <small>{row.taskId}{row.trade ? ` / ${row.trade}` : ""}</small>
                </div>

                {row.days.map((day) => {
                  const key = `${row.taskId}|${day.date}`;
                  const symbol = marks.get(key) ?? "";
                  const activeOption = symbol ? symbolOptions.find((option) => option.value === symbol) : null;
                  const busy = working === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      className={symbol ? `tma-lookahead-cell tma-lookahead-cell-marked tma-lookahead-cell-${symbolClass(symbol)}` : "tma-lookahead-cell"}
                      disabled={busy}
                      onClick={() => save(row.taskId, day.date, selectedSymbol)}
                      title={`${row.taskName} ${day.label}: ${activeOption?.label ?? "No mark"}`}
                    >
                      <span>{busy ? "..." : activeOption?.short ?? ""}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function symbolClass(symbol: string) {
  if (symbol === "/") return "scheduled";
  if (symbol === "X") return "worked";
  if (symbol === "!") return "inspection";
  if (symbol === "0") return "behind";
  return "clear";
}
