"use client";

import { useState } from "react";
import { normalizeProjectProfile } from "@/lib/project-profile";

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [thisWeekStart, setThisWeekStart] = useState("");
  const [structureType, setStructureType] = useState<"House" | "Condo">("House");
  const [scopeType, setScopeType] = useState<"BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild">("FullRemodel");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const normalized = normalizeProjectProfile(structureType, scopeType);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          preparedBy,
          thisWeekStart,
          structureType: normalized.structureType,
          scopeType: normalized.scopeType,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : "Failed");

      setMessage(`Created project: ${data.project.name}. Opening project...`);
      setName("");
      setPreparedBy("");
      setThisWeekStart("");
      setStructureType("House");
      setScopeType("FullRemodel");
      window.location.assign(`/projects/${data.project.id}`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="app-card p-4 space-y-3">
      <h3 className="app-title text-xl">Create Project</h3>
      <div className="grid md:grid-cols-5 gap-3">
        <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Prepared by" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
        <input type="date" value={thisWeekStart} onChange={(e) => setThisWeekStart(e.target.value)} />
        <select value={structureType} onChange={(e) => {
          const value = e.target.value as "House" | "Condo";
          setStructureType(value);
          if (value === "Condo" && (scopeType === "NewBuild" || scopeType === "Addition")) {
            setScopeType("FullRemodel");
          }
        }}>
          <option value="House">House</option>
          <option value="Condo">Condo</option>
        </select>
        <select value={scopeType} onChange={(e) => setScopeType(e.target.value as "BathRemodel" | "PartialRemodel" | "FullRemodel" | "Addition" | "NewBuild")}>
          <option value="BathRemodel">Bath Remodel</option>
          <option value="PartialRemodel">Partial Remodel</option>
          <option value="FullRemodel">Full Remodel</option>
          {structureType === "House" ? <option value="Addition">Addition</option> : null}
          {structureType === "House" ? <option value="NewBuild">New Build</option> : null}
        </select>
      </div>
      <button className="btn btn-primary" disabled={saving || !name.trim()} type="submit">
        {saving ? "Creating..." : "Create"}
      </button>
      {message ? <p className="text-sm">{message}</p> : null}
    </form>
  );
}
