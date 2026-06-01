"use client";

import { useState } from "react";

export function CreateProjectForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!name.trim()) {
      setMessage("Project name is required.");
      return;
    }
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Failed to create project");
      return;
    }
    setMessage(`Created ${data.project.name}.`);
    setName("");
  }

  return (
    <form className="tma-card" onSubmit={submit}>
      <h3 className="tma-section-title tma-mb-3">New Project</h3>
      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="tma-input md:col-span-2"
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="tma-button text-[0.65rem] py-2 px-4" type="submit">
          Create
        </button>
      </div>
      {message ? <p className="tma-text-xs tma-mt-2 text-ink-dim">{message}</p> : null}
    </form>
  );
}
