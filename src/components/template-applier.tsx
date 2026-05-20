"use client";

import { useMemo, useState } from "react";

export function TemplateApplier({ projectId }: { projectId: string }) {
  const [constructionType, setConstructionType] = useState<"Condo" | "House">("House");
  const [scope, setScope] = useState<"BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild">("FullRemodel");
  const [clearExisting, setClearExisting] = useState(true);
  const [message, setMessage] = useState("");

  const options = useMemo(() => {
    if (constructionType === "House") return ["BathRemodel", "PartialRemodel", "FullRemodel", "Addition", "NewBuild"];
    return ["BathRemodel", "PartialRemodel", "FullRemodel"];
  }, [constructionType]);

  async function applyTemplate() {
    setMessage("Applying template...");
    const selectedScope = options.includes(scope) ? scope : options[0];

    const res = await fetch(`/api/projects/${projectId}/apply-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ constructionType, scope: selectedScope, clearExisting }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Failed to apply template");
      return;
    }

    setMessage(`Applied ${constructionType} + ${selectedScope}. Imported ${data.tasksImported} tasks. Refresh page to view.`);
  }

  return (
    <div className="app-card p-4">
      <h3 className="app-title text-xl mb-2">Sequence Builder</h3>
      <p className="text-sm text-slate-600 mb-3">Detailed template packs, including `House + New Construction`.</p>
      <div className="grid md:grid-cols-4 gap-2">
        <select value={constructionType} onChange={(e) => setConstructionType(e.target.value as "Condo" | "House")}>
          <option value="House">House</option>
          <option value="Condo">Condo</option>
        </select>

        <select value={scope} onChange={(e) => setScope(e.target.value as "BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild")}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} />
          Replace Existing Sequence
        </label>

        <button className="btn btn-primary" type="button" onClick={applyTemplate}>
          Apply Template
        </button>
      </div>
      {message ? <p className="text-sm mt-2">{message}</p> : null}
    </div>
  );
}
