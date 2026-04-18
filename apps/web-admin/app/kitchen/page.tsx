"use client";

import { useCallback, useEffect, useState } from "react";
import { tajClientLog } from "../../lib/clientLog";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "taj_kitchen_jwt";
const SLUG_KEY = "taj_kitchen_slug";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitCents: number;
};

type Order = {
  id: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  fulfillmentType: "DELIVERY" | "PICKUP";
  deliveryAddress: string | null;
  deliveryInstructions: string | null;
  deliveryCity: string | null;
  deliveryPostalCode: string | null;
  orderSource: string;
  paymentMethod: string | null;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
};

function formatEUR(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function KitchenPage() {
  const [email, setEmail] = useState("cuisine@taj.local");
  const [password, setPassword] = useState("ChangeMeDev123!");
  const [tenantSlug, setTenantSlug] = useState("taj-poulet-demo");
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    const s = sessionStorage.getItem(SLUG_KEY);
    if (t) {
      setToken(t);
    }
    if (s) {
      setTenantSlug(s);
    }
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    tajClientLog("kitchen", "load orders start");
    setListLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/kitchen/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": tenantSlug,
        },
      });
      if (!res.ok) {
        const t = await res.text();
        tajClientLog("kitchen", "load orders fail", res.status, t);
        setMessage(t);
        return;
      }
      const list = (await res.json()) as Order[];
      tajClientLog("kitchen", "load orders ok", list.length);
      setOrders(list);
    } catch (e) {
      tajClientLog("kitchen", "load orders error", e);
      setMessage(String(e));
    } finally {
      setListLoading(false);
    }
  }, [token, tenantSlug]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 20000);
    return () => clearInterval(id);
  }, [load]);

  const setStatus = useCallback(
    async (orderId: string, status: string) => {
      if (!token) {
        return;
      }
      tajClientLog("kitchen", "setStatus", orderId, status);
      setActionBusy(true);
      setMessage(null);
      try {
        const res = await fetch(`${apiBase}/orders/${orderId}/status`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "x-tenant-slug": tenantSlug,
          },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const t = await res.text();
          tajClientLog("kitchen", "setStatus fail", res.status, t);
          setMessage(t);
          return;
        }
        tajClientLog("kitchen", "setStatus ok");
        await load();
      } catch (e) {
        tajClientLog("kitchen", "setStatus error", e);
        setMessage(String(e));
      } finally {
        setActionBusy(false);
      }
    },
    [token, tenantSlug, load],
  );

  const login = useCallback(async () => {
    tajClientLog("kitchen", "login click");
    setActionBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug }),
      });
      const data = (await res.json()) as { access_token?: string; message?: string };
      if (!res.ok || !data.access_token) {
        tajClientLog("kitchen", "login fail", res.status, data.message);
        setMessage(data.message ?? `Erreur ${res.status}`);
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.setItem(SLUG_KEY, tenantSlug);
      setToken(data.access_token);
      setMessage("Connecté — ligne cuisine.");
      tajClientLog("kitchen", "login ok");
    } catch (e) {
      tajClientLog("kitchen", "login error", e);
      setMessage(String(e));
    } finally {
      setActionBusy(false);
    }
  }, [email, password, tenantSlug]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrders([]);
  }, []);

  return (
    <div className="admin-shell kitchen-shell">
      <header className="admin-top">
        <div>
          <h1>Cuisine (KDS)</h1>
          <p className="muted">
            Commandes à préparer ·{" "}
            <a href="/">accueil</a>
            {" · "}
            <a href="/admin">back-office</a>
          </p>
        </div>
        {token && (
          <button type="button" className="btn ghost" onClick={logout}>
            Déconnexion
          </button>
        )}
      </header>

      {!token ? (
        <section className="card login-card">
          <h2>Connexion cuisine</h2>
          <p className="muted small">
            Compte démo : <code>cuisine@taj.local</code> / même mot de passe que
            l’admin.
          </p>
          <label className="field">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="field">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="field">
            Slug restaurant
            <input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn primary"
            disabled={actionBusy}
            onClick={() => void login()}
          >
            Se connecter
          </button>
        </section>
      ) : (
        <>
          <div className="toolbar">
            <p className="muted">
              {orders.length} commande(s) en file (payées / en prep / prêtes)
              {listLoading ? " · chargement…" : ""}
            </p>
            <button
              type="button"
              className="btn ghost"
              disabled={listLoading}
              onClick={() => void load()}
            >
              Rafraîchir
            </button>
          </div>
          {message && (
            <div className="banner" role="status">
              {message}
            </div>
          )}
          <div className="kitchen-board">
            {orders.length === 0 && (
              <p className="muted">Aucune commande pour le moment.</p>
            )}
            {orders.map((o) => (
              <article key={o.id} className="card kitchen-card">
                <div className="kitchen-card-head">
                  <span className={`kitchen-status st-${o.status}`}>
                    {o.status}
                  </span>
                  <span className="kitchen-src">{o.orderSource}</span>
                  <strong className="kitchen-total">{formatEUR(o.totalCents)}</strong>
                </div>
                <div
                  className={
                    o.fulfillmentType === "DELIVERY"
                      ? "kitchen-fulfill delivery"
                      : "kitchen-fulfill pickup"
                  }
                >
                  {o.fulfillmentType === "DELIVERY" ? "Livraison" : "À emporter"}
                </div>
                {o.fulfillmentType === "DELIVERY" && (
                  <div className="kitchen-address">
                    <strong>Adresse</strong>
                    <p>
                      {[o.deliveryAddress, o.deliveryPostalCode, o.deliveryCity]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                    {o.deliveryInstructions && (
                      <p className="muted small">
                        Note : {o.deliveryInstructions}
                      </p>
                    )}
                  </div>
                )}
                <div className="kitchen-customer">
                  <span>{o.customerName ?? "Client"}</span>
                  {o.customerPhone && <span> · {o.customerPhone}</span>}
                  {o.paymentMethod && (
                    <span className="muted"> · Paiement : {o.paymentMethod}</span>
                  )}
                </div>
                <ul className="kitchen-lines">
                  {o.items.map((li) => (
                    <li key={li.id}>
                      <span>
                        {li.name} × {li.quantity}
                      </span>
                      <span>{formatEUR(li.unitCents * li.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="kitchen-actions">
                  {o.status === "PAID" && (
                    <button
                      type="button"
                      className="btn primary"
                      disabled={actionBusy}
                      onClick={() => void setStatus(o.id, "IN_KITCHEN")}
                    >
                      En préparation
                    </button>
                  )}
                  {o.status === "IN_KITCHEN" && (
                    <button
                      type="button"
                      className="btn primary"
                      disabled={actionBusy}
                      onClick={() => void setStatus(o.id, "READY")}
                    >
                      Prêt
                    </button>
                  )}
                  {o.status === "READY" && (
                    <p className="muted small">
                      En attente caisse / livreur (hors cuisine).
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
