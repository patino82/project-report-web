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

type Draft = {
  type: "ESTIMATE" | "PO";
  trade: string;
  vendor: string;
  description: string;
  estimateCode: string;
  amount: string;
  status: "DRAFT" | "APPROVED" | "ISSUED" | "PAID" | "VOID";
  targetDate: string;
  actualDate: string;
  notes: string;
  linkedEstimateId: string;
};

const defaultDraft: Draft = {
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
  const [draft, setDraft] = useState<Draft>({ ...defaultDraft });

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
    <section className="tma-space-y-4">
      <div className="tma-card tma-flex tma-flex-wrap tma-items-center tma-justify-between tma-gap-2">
        <h3 className="tma-section-title tma-section-pop">Cost Intelligence (PO + Estimates)</h3>
        <button className="tma-button-secondary text-[0.65rem] py-2 px-4" onClick={load} disabled={loading}>
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

      <div className="tma-card">
        <h4 className="tma-section-title tma-mb-2">Add Estimate / PO</h4>
        <div className="tma-cost-form-grid tma-mb-2">
          <select className="tma-select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as "ESTIMATE" | "PO" })}>
            <option value="ESTIMATE">Estimate</option>
            <option value="PO">PO</option>
          </select>
          <input className="tma-input" placeholder="Trade (e.g. Framing)" value={draft.trade} onChange={(e) => setDraft({ ...draft, trade: e.target.value })} />
          <input className="tma-input" placeholder="Vendor" value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} />
          <input className="tma-input" placeholder="Estimate Code" value={draft.estimateCode} onChange={(e) => setDraft({ ...draft, estimateCode: e.target.value })} />
          <input className="tma-input md:col-span-2" placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <input className="tma-input" placeholder="Amount" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
          <select className="tma-select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as "DRAFT" | "APPROVED" | "ISSUED" | "PAID" | "VOID" })}>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="ISSUED">ISSUED</option>
            <option value="PAID">PAID</option>
            <option value="VOID">VOID</option>
          </select>
          <input className="tma-input" placeholder="Target Date" type="date" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} />
          <input className="tma-input" placeholder="Actual Date" type="date" value={draft.actualDate} onChange={(e) => setDraft({ ...draft, actualDate: e.target.value })} />
          <input className="tma-input" placeholder="Linked Estimate ID (for PO)" value={draft.linkedEstimateId} onChange={(e) => setDraft({ ...draft, linkedEstimateId: e.target.value })} />
          <input className="tma-input md:col-span-3" placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </div>
        <div className="tma-mt-2">
          <button className="tma-button text-[0.65rem] py-2 px-4" onClick={createItem} disabled={saving}>
            {saving ? "Saving..." : "Save Item"}
          </button>
        </div>
        {error ? <p className="tma-text-xs tma-mt-2 text-red-400">{error}</p> : null}
      </div>

      <div className="tma-card tma-table-scroll">
        <h4 className="tma-section-title tma-mb-2">Trade Estimate Accuracy</h4>
        <table className="tma-table tma-table-compact">
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
                <td><span className="tma-table-name">{r.trade}</span></td>
                <td>{money(r.estimateTotal)}</td>
                <td>{money(r.poTotal)}</td>
                <td>{money(r.variance)}</td>
                <td>{r.variancePct == null ? "-" : `${r.variancePct}%`}</td>
                <td>{r.recommendationFactor == null ? "-" : `${r.recommendationFactor}x`}</td>
              </tr>
            ))}
            {!data?.insights.byTrade.length ? (
              <tr>
                <td colSpan={6} className="tma-empty">No cost history yet. Add estimates and POs to build future estimating intelligence.</td>
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
  const toneClass = tone === "bad" ? "tma-metric-bad" : tone === "warn" ? "tma-metric-warn" : "tma-metric";
  return (
    <div className={toneClass}>
      <div className="tma-metric-label">{title}</div>
      <div className="tma-metric-value">{value}</div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: CostItem[] }) {
  return (
    <div className="tma-card tma-table-scroll">
      <h4 className="tma-section-title tma-mb-2">{title}</h4>
      <table className="tma-table tma-table-compact">
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
              <td><span className="tma-table-name">{i.trade}</span></td>
              <td>{i.description}</td>
              <td>{i.vendor || "-"}</td>
              <td>{i.status}</td>
              <td>{money(i.amount)}</td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td colSpan={5} className="tma-empty">No items yet.</td>
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
