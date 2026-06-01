"use client";

import { useState } from "react";

export function WorkbookDownloadButton({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function downloadFile(url: string, fallbackName: string) {
    const res = await fetch(url);
    const data = await res.blob();

    if (!res.ok) {
      let msg = `Download failed: ${res.status}`;
      try {
        const parsed = JSON.parse(await data.text());
        msg = parsed.error ?? msg;
      } catch {}
      throw new Error(msg);
    }

    const disposition = res.headers.get("content-disposition");
    const match = disposition?.match(/filename="?([^\"]+)"?/i);
    const filename = match?.[1] ?? fallbackName;

    const objectUrl = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function downloadBoth() {
    setBusy(true);
    setMessage("");

    try {
      await Promise.all([
        downloadFile(`/api/projects/${projectId}/workbook`, "project-workbook.xlsx"),
        downloadFile(`/api/projects/${projectId}/workbook-template`, "new-project-template.xlsx"),
      ]);
      setMessage("Downloaded project workbook and new-project template.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to download workbooks");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tma-inline-action">
      <button className="tma-button-secondary text-[0.65rem] py-2 px-4" onClick={downloadBoth} disabled={busy}>
        {busy ? "Preparing Workbooks..." : "Download Workbooks"}
      </button>
      {message ? <p className="tma-text-xs text-ink-muted">{message}</p> : null}
    </div>
  );
}
