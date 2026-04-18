"use client";

import { useCallback, useMemo, useState } from "react";
import { tajClientLog } from "../../lib/clientLog";

type Props = {
  apiBase: string;
  token: string;
  tenantSlug: string;
};

type Report = {
  from: string;
  to: string;
  orderCount: number;
  totalCents: number;
  byPaymentMethod: {
    paymentMethod: string | null;
    orderCount: number;
    totalCents: number;
  }[];
};

function formatEUR(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AdminSalesTab({ apiBase, token, tenantSlug }: Props) {
  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from: toInputDate(from), to: toInputDate(to) };
  }, []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    tajClientLog("sales", "load report", { from, to });
    setBusy(true);
    setMessage(null);
    try {
      const fromIso = new Date(`${from}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999Z`).toISOString();
      const q = new URLSearchParams({ from: fromIso, to: toIso });
      const res = await fetch(`${apiBase}/admin/sales-report?${q}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": tenantSlug,
        },
      });
      if (!res.ok) {
        const t = await res.text();
        tajClientLog("sales", "load fail", res.status, t);
        setMessage(t);
        setReport(null);
        return;
      }
      const r = (await res.json()) as Report;
      tajClientLog("sales", "load ok", r.orderCount);
      setReport(r);
    } catch (e) {
      tajClientLog("sales", "load error", e);
      setMessage(String(e));
      setReport(null);
    } finally {
      setBusy(false);
    }
  }, [apiBase, token, tenantSlug, from, to]);

  return (
    <section>
      <div className="toolbar">
        <h2>Stats de vente (caisse)</h2>
        <button type="button" className="btn ghost" onClick={() => void load()}>
          {busy ? "…" : "Actualiser"}
        </button>
      </div>
      <p className="muted small">
        Commandes encaissées (hors brouillon / annulées / en attente de paiement),
        ventilées par moyen de paiement enregistré en caisse.
      </p>
      <div className="card sales-filters">
        <label className="field">
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field">
          Au
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      {message && (
        <div className="banner" role="status">
          {message}
        </div>
      )}
      {report && (
        <div className="card">
          <p>
            <strong>{report.orderCount}</strong> commandes · total{" "}
            <strong>{formatEUR(report.totalCents)}</strong>
          </p>
          <table className="sales-table">
            <thead>
              <tr>
                <th>Moyen de paiement</th>
                <th>Commandes</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {report.byPaymentMethod.map((row) => (
                <tr key={row.paymentMethod ?? "null"}>
                  <td>{row.paymentMethod ?? "Non renseigné"}</td>
                  <td>{row.orderCount}</td>
                  <td>{formatEUR(row.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
