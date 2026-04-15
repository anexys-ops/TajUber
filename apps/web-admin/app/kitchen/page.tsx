"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/kitchen/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-tenant-slug": tenantSlug,
        },
      });
      if (!res.ok) {
        setMessage(await res.text());
        return;
      }
      setOrders((await res.json()) as Order[]);
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
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
      setBusy(true);
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
          setMessage(await res.text());
          return;
        }
        await load();
      } catch (e) {
        setMessage(String(e));
      } finally {
        setBusy(false);
      }
    },
    [token, tenantSlug, load],
  );

  const login = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug }),
      });
      const data = (await res.json()) as { access_token?: string; message?: string };
      if (!res.ok || !data.access_token) {
        setMessage(data.message ?? `Erreur ${res.status}`);
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.setItem(SLUG_KEY, tenantSlug);
      setToken(data.access_token);
      setMessage("Connecté — ligne cuisine.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
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
            <Link href="/">accueil</Link>
            {" · "}
            <Link href="/admin">back-office</Link>
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
            disabled={busy}
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
            </p>
            <button type="button" className="btn ghost" onClick={() => void load()}>
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
                      disabled={busy}
                      onClick={() => void setStatus(o.id, "IN_KITCHEN")}
                    >
                      En préparation
                    </button>
                  )}
                  {o.status === "IN_KITCHEN" && (
                    <button
                      type="button"
                      className="btn primary"
                      disabled={busy}
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
