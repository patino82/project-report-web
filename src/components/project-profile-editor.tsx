"use client";

import { useState } from "react";
import { normalizeProjectProfile, type ScopeType, type StructureType } from "@/lib/project-profile";

export function ProjectProfileEditor({
  projectId,
  initialStructure,
  initialScope,
}: {
  projectId: string;
  initialStructure: StructureType;
  initialScope: ScopeType;
}) {
  const [structureType, setStructureType] = useState<StructureType>(initialStructure);
  const [scopeType, setScopeType] = useState<ScopeType>(initialScope);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage("");

    try {
      const normalized = normalizeProjectProfile(structureType, scopeType);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Failed to save project profile");
      setStructureType(normalized.structureType);
      setScopeType(normalized.scopeType);
      setMessage("Project profile saved.");
      setOpen(false);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="app-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="app-title text-xl">Project Type</h3>
          <p className="text-sm text-slate-600 mt-1">{structureType} / {scopeType}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setOpen(true)}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="app-card p-4">
      <h3 className="app-title text-xl mb-2">Project Type</h3>
      <div className="grid md:grid-cols-4 gap-2">
        <select
          value={structureType}
          onChange={(e) => {
            const value = e.target.value as StructureType;
            setStructureType(value);
            if (value === "Condo" && (scopeType === "NewBuild" || scopeType === "Addition")) {
              setScopeType("FullRemodel");
            }
          }}
        >
          <option value="House">House</option>
          <option value="Condo">Condo</option>
        </select>

        <select value={scopeType} onChange={(e) => setScopeType(e.target.value as ScopeType)}>
          <option value="BathRemodel">Bath Remodel</option>
          <option value="PartialRemodel">Partial Remodel</option>
          <option value="FullRemodel">Full Remodel</option>
          {structureType === "House" ? <option value="Addition">Addition</option> : null}
          {structureType === "House" ? <option value="NewBuild">New Build</option> : null}
        </select>

        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Type"}
        </button>

        <button className="btn btn-secondary" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
      </div>
      {message ? <p className="text-sm mt-2">{message}</p> : null}
    </div>
  );
}
