"use client";

import { useState } from "react";

type CompanyData = {
  id: string;
  name: string;
  contacts: Array<{ id: string; name: string; phone?: string | null; email?: string | null; role?: string | null; isPrimary: boolean }>;
  trades: Array<{ id: string; isPrimary: boolean; trade: { name: string } }>;
};

export function PartnersManager({ companies }: { companies: CompanyData[] }) {
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");

  async function createCompany() {
    setMessage("");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "company", name: company }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Failed");
      return;
    }
    setMessage(`Company saved: ${data.company.name}. Refresh to view.`);
    setCompany("");
  }

  async function mapTrade() {
    setMessage("");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "tradeMap", company, trade }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Failed");
      return;
    }
    setMessage(`Mapped ${company} to trade ${trade}. Refresh to view.`);
    setTrade("");
  }

  async function addContact() {
    setMessage("");
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "contact",
        company: contactCompany,
        name: contactName,
        phone,
        email,
        role,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ? JSON.stringify(data.error) : "Failed");
      return;
    }
    setMessage(`Contact added for ${contactCompany}. Refresh to view.`);
    setContactCompany("");
    setContactName("");
    setPhone("");
    setEmail("");
    setRole("");
  }

  return (
    <div className="space-y-4">
      <div className="app-card p-4">
        <h3 className="app-title text-xl mb-3">Partner Network</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input placeholder="Trade" value={trade} onChange={(e) => setTrade(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-primary" type="button" onClick={createCompany}>
              Add Company
            </button>
            <button className="btn btn-secondary" type="button" onClick={mapTrade}>
              Map Trade
            </button>
          </div>
        </div>
      </div>

      <div className="app-card p-4">
        <h4 className="font-semibold mb-2">Add Contact</h4>
        <div className="grid md:grid-cols-5 gap-2">
          <input placeholder="Company" value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} />
          <input placeholder="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <button className="btn btn-warn mt-2" type="button" onClick={addContact}>
          Add Contact
        </button>
      </div>

      <div className="app-card p-4 table-scroll">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Trades</th>
              <th>Contacts</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.trades.map((t) => t.trade.name).join(", ") || "-"}</td>
                <td>
                  {c.contacts.map((ct) => `${ct.name}${ct.phone ? ` (${ct.phone})` : ""}`).join("; ") || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message ? <p className="text-sm">{message}</p> : null}
    </div>
  );
}
