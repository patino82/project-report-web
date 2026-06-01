"use client";

import { useMemo, useState } from "react";
import * as amplitude from "@amplitude/unified";

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

    amplitude.track("Template Applied", {
      project_id: projectId,
      construction_type: constructionType,
      scope: selectedScope,
      clear_existing: clearExisting,
      tasks_imported: data.tasksImported,
    });
    setMessage(`Applied ${constructionType} + ${selectedScope}. Imported ${data.tasksImported} tasks. Refresh page to view.`);
  }

  return (
    <section className="tma-card">
      <h3 className="tma-section-title tma-mb-2">Sequence Builder</h3>
      <p className="tma-text-xs text-ink-muted tma-mb-3">Detailed template packs, including `House + New Construction`.</p>
      <div className="grid md:grid-cols-4 gap-2">
        <select className="tma-select" value={constructionType} onChange={(e) => setConstructionType(e.target.value as "Condo" | "House")}>
          <option value="House">House</option>
          <option value="Condo">Condo</option>
        </select>

        <select className="tma-select" value={scope} onChange={(e) => setScope(e.target.value as "BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild")}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <label className="tma-flex tma-items-center tma-gap-2 tma-text-xs text-ink-dim">
          <input className="tma-checkbox" type="checkbox" checked={clearExisting} onChange={(e) => setClearExisting(e.target.checked)} />
          Replace Existing Sequence
        </label>

        <button className="tma-button text-[0.65rem] py-2 px-4" type="button" onClick={applyTemplate}>
          Apply Template
        </button>
      </div>
      {message ? <p className="tma-text-xs tma-mt-2 text-ink-dim">{message}</p> : null}
    </section>
  );
}
