"use client";

import { useState } from "react";

export function BossLookaheadButton({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setBusy(true);
    setMsg("");
    try {
      window.open(`/api/projects/${projectId}/report`, "_blank");
      const res = await fetch(`/api/projects/${projectId}/boss-email`);
      const json = await res.json();
      if (res.ok && json.body) {
        await navigator.clipboard.writeText(json.body);
        setMsg("Boss update generated. PDF opened and email body copied to clipboard.");
      } else {
        setMsg("PDF opened. Could not copy email body.");
      }
    } catch {
      setMsg("PDF opened. Copy email manually from Operations if needed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tma-inline-action">
      <button className="tma-button-warn text-[0.65rem] py-2 px-4" onClick={generate} disabled={busy}>
        {busy ? "Generating..." : "Generate Boss 2-Week"}
      </button>
      {msg ? <p className="tma-text-xs text-ink-muted">{msg}</p> : null}
    </div>
  );
}
