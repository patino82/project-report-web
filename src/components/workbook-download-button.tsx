"use client";

import { useState } from "react";

function fileNameFromDisposition(value: string | null, fallback: string) {
  const match = value?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(url);
  const data = await res.blob();

  if (!res.ok) {
    let message = `Download failed: ${res.status}`;
    try {
      const parsed = JSON.parse(await data.text());
      message = parsed.error ?? message;
    } catch {}
    throw new Error(message);
  }

  const filename = fileNameFromDisposition(res.headers.get("content-disposition"), fallbackName);
  const objectUrl = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function WorkbookDownloadButton({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
    <div className="inline-action">
      <button className="btn btn-secondary" onClick={downloadBoth} disabled={busy}>
        {busy ? "Preparing Workbooks..." : "Download Workbooks"}
      </button>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
