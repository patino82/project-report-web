"use client";

import { useEffect, useMemo, useState } from "react";

type CostItem = {
  id: string;
  type: "ESTIMATE" | "PO";
  trade: string;
  vendor: string | null;
  description: string;
  estimateCode: string | null;
  amount: number;
  status: "DRAFT" | "APPROVED" | "ISSUED" | "PAID" | "VOID";
  targetDate: string | null;
  actualDate: string | null;
  notes: string | null;
  linkedEstimateId: string | null;
  createdAt: string;
};

type InsightRow = {
  trade: string;
  estimateTotal: number;
  poTotal: number;
  variance: number;
  variancePct: number | null;
  recommendationFactor: number | null;
};

type CostResponse = {
  items: CostItem[];
  insights: {
    estimateTotal: number;
    poTotal: number;
    overallVariance: number;
    overallVariancePct: number | null;
    byTrade: InsightRow[];
  };
};

const defaultDraft = {
  type: "ESTIMATE",
  trade: "",
  vendor: "",
  description: "",
  estimateCode: "",
  amount: "",
  status: "DRAFT",
  targetDate: "",
  actualDate: "",
  notes: "",
  linkedEstimateId: "",
};

export function CostTracker({ projectId }: { projectId: string }) {
  const [data, setData] = useState<CostResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ ...defaultDraft });

  const estimateItems = useMemo(() => data?.items.filter((i) => i.type === "ESTIMATE") ?? [], [data]);
  const poItems = useMemo(() => data?.items.filter((i) => i.type === "PO") ?? [], [data]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load costs");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createItem() {
    if (!draft.trade.trim() || !draft.description.trim() || !draft.amount) {
      setError("Trade, description, and amount are required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: draft.type,
          trade: draft.trade,
          vendor: draft.vendor || null,
          description: draft.description,
          estimateCode: draft.estimateCode || null,
          amount: Number(draft.amount),
          status: draft.status,
          targetDate: draft.targetDate || null,
          actualDate: draft.actualDate || null,
          notes: draft.notes || null,
          linkedEstimateId: draft.linkedEstimateId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create cost item");
      setDraft({ ...defaultDraft });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-card p-4 section-pop space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="app-title text-2xl section-heading">Cost Intelligence (PO + Estimates)</h3>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Metric title="Estimate Total" value={money(data?.insights.estimateTotal ?? 0)} tone="ok" />
        <Metric title="PO Total" value={money(data?.insights.poTotal ?? 0)} tone="warn" />
        <Metric
          title="Variance"
          value={money(data?.insights.overallVariance ?? 0)}
          tone={(data?.insights.overallVariance ?? 0) > 0 ? "bad" : "ok"}
        />
        <Metric
          title="Variance %"
          value={data?.insights.overallVariancePct == null ? "-" : `${data.insights.overallVariancePct}%`}
          tone={(data?.insights.overallVariancePct ?? 0) > 0 ? "bad" : "ok"}
        />
      </div>

      <div className="app-card p-3">
        <h4 className="app-title text-xl mb-2">Add Estimate / PO</h4>
        <div className="grid md:grid-cols-4 gap-2">
          <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
            <option value="ESTIMATE">Estimate</option>
            <option value="PO">PO</option>
          </select>
          <input placeholder="Trade (e.g. Framing)" value={draft.trade} onChange={(e) => setDraft((d) => ({ ...d, trade: e.target.value }))} />
          <input placeholder="Vendor" value={draft.vendor} onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value }))} />
          <input placeholder="Estimate Code" value={draft.estimateCode} onChange={(e) => setDraft((d) => ({ ...d, estimateCode: e.target.value }))} />
          <input className="md:col-span-2" placeholder="Description" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          <input placeholder="Amount" type="number" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
          <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="ISSUED">ISSUED</option>
            <option value="PAID">PAID</option>
            <option value="VOID">VOID</option>
          </select>
          <input placeholder="Target Date" type="date" value={draft.targetDate} onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value }))} />
          <input placeholder="Actual Date" type="date" value={draft.actualDate} onChange={(e) => setDraft((d) => ({ ...d, actualDate: e.target.value }))} />
          <input placeholder="Linked Estimate ID (for PO)" value={draft.linkedEstimateId} onChange={(e) => setDraft((d) => ({ ...d, linkedEstimateId: e.target.value }))} />
          <input className="md:col-span-3" placeholder="Notes" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
        </div>
        <div className="mt-2">
          <button className="btn btn-primary" onClick={createItem} disabled={saving}>{saving ? "Saving..." : "Save Item"}</button>
        </div>
        {error ? <p className="text-sm text-red-700 mt-2">{error}</p> : null}
      </div>

      <div className="app-card p-3 table-scroll">
        <h4 className="app-title text-xl mb-2">Trade Estimate Accuracy</h4>
        <table>
          <thead>
            <tr>
              <th>Trade</th>
              <th>Estimate</th>
              <th>PO</th>
              <th>Variance</th>
              <th>Variance %</th>
              <th>Future Factor</th>
            </tr>
          </thead>
          <tbody>
            {(data?.insights.byTrade ?? []).map((r) => (
              <tr key={r.trade}>
                <td>{r.trade}</td>
                <td>{money(r.estimateTotal)}</td>
                <td>{money(r.poTotal)}</td>
                <td>{money(r.variance)}</td>
                <td>{r.variancePct == null ? "-" : `${r.variancePct}%`}</td>
                <td>{r.recommendationFactor == null ? "-" : `${r.recommendationFactor}x`}</td>
              </tr>
            ))}
            {!data?.insights.byTrade.length ? (
              <tr>
                <td colSpan={6}>No cost history yet. Add estimates and POs to build future estimating intelligence.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <ListCard title={`Estimates (${estimateItems.length})`} items={estimateItems} />
        <ListCard title={`POs (${poItems.length})`} items={poItems} />
      </div>
    </section>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "ok" | "warn" | "bad" }) {
  const toneClass = tone === "bad" ? "metric-bad" : tone === "warn" ? "metric-warn" : "";
  return (
    <div className={`app-card p-3 metric-card ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: CostItem[] }) {
  return (
    <div className="app-card p-3 table-scroll">
      <h4 className="app-title text-xl mb-2">{title}</h4>
      <table>
        <thead>
          <tr>
            <th>Trade</th>
            <th>Description</th>
            <th>Vendor</th>
            <th>Status</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.trade}</td>
              <td>{i.description}</td>
              <td>{i.vendor || "-"}</td>
              <td>{i.status}</td>
              <td>{money(i.amount)}</td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td colSpan={5}>No items yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}
