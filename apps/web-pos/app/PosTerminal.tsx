"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { tajClientLog } from "../lib/clientLog";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const defaultTenantSlug =
  process.env.NEXT_PUBLIC_TENANT_SLUG ?? "taj-poulet-demo";
const POS_TOKEN_KEY = "taj_pos_jwt";
const POS_SLUG_KEY = "taj_pos_slug";

type MenuItem = {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  priceCents: number;
  photoUrl: string | null;
  isAvailable: boolean;
};

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  percentOff: unknown;
  active: boolean;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Espèces" },
  { value: "MEAL_VOUCHER", label: "Titre restaurant" },
  { value: "QONTO", label: "Virement / Qonto" },
  { value: "OTHER", label: "Autre" },
  { value: "STRIPE", label: "Carte (Stripe — après PaymentIntent)" },
] as const;

function formatEUR(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function PosTerminal() {
  const [tenantSlug, setTenantSlug] = useState(defaultTenantSlug);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("Client comptoir");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">(
    "PICKUP",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [posEmail, setPosEmail] = useState("caisse@taj.local");
  const [posPassword, setPosPassword] = useState("ChangeMeDev123!");
  const [posToken, setPosToken] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem(POS_TOKEN_KEY);
    const s = sessionStorage.getItem(POS_SLUG_KEY);
    if (t) {
      setPosToken(t);
    }
    if (s) {
      setTenantSlug(s);
    }
  }, []);

  const loadCatalog = useCallback(async () => {
    tajClientLog("pos", "loadCatalog", { tenantSlug });
    setError(null);
    try {
      const h = { "x-tenant-slug": tenantSlug };
      const [mi, pr] = await Promise.all([
        fetch(`${apiBase}/catalog/menu-items`, { headers: h }),
        fetch(`${apiBase}/catalog/promotions`, { headers: h }),
      ]);
      if (!mi.ok) {
        tajClientLog("pos", "loadCatalog menu fail", mi.status);
        setError(`Menu : erreur ${mi.status} — l’API est-elle démarrée ?`);
        return;
      }
      const menu = (await mi.json()) as MenuItem[];
      tajClientLog("pos", "loadCatalog ok", menu.length, "articles");
      setItems(menu);
      if (pr.ok) {
        setPromos((await pr.json()) as Promotion[]);
      }
    } catch (e) {
      tajClientLog("pos", "loadCatalog error", e);
      setError("API injoignable (vérifiez l’API et Postgres).");
    }
  }, [tenantSlug]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of items.filter((i) => i.isAvailable)) {
      const c = it.category ?? "Autres";
      if (!map.has(c)) {
        map.set(c, []);
      }
      map.get(c)!.push(it);
    }
    return map;
  }, [items]);

  const totalCents = useMemo(() => {
    let t = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const it = items.find((x) => x.id === id);
      if (it) {
        t += it.priceCents * qty;
      }
    }
    return t;
  }, [cart, items]);

  function addToCart(id: string) {
    tajClientLog("pos", "addToCart", id);
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }

  function decFromCart(id: string) {
    tajClientLog("pos", "decFromCart", id);
    setCart((c) => {
      const n = { ...c };
      const q = (n[id] ?? 0) - 1;
      if (q <= 0) {
        delete n[id];
      } else {
        n[id] = q;
      }
      return n;
    });
  }

  async function posLogin() {
    tajClientLog("pos", "posLogin click", { tenantSlug });
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: posEmail,
          password: posPassword,
          tenantSlug,
        }),
      });
      const data = (await res.json()) as { access_token?: string; message?: string };
      if (!res.ok || !data.access_token) {
        tajClientLog("pos", "posLogin fail", res.status, data.message);
        setError(data.message ?? `Login ${res.status}`);
        return;
      }
      sessionStorage.setItem(POS_TOKEN_KEY, data.access_token);
      sessionStorage.setItem(POS_SLUG_KEY, tenantSlug);
      setPosToken(data.access_token);
      tajClientLog("pos", "posLogin ok");
    } catch (e) {
      tajClientLog("pos", "posLogin error", e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function posLogout() {
    sessionStorage.removeItem(POS_TOKEN_KEY);
    setPosToken(null);
  }

  async function submitOrder() {
    tajClientLog("pos", "submitOrder click");
    const lines = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (lines.length === 0) {
      setError("Panier vide.");
      return;
    }
    if (fulfillmentType === "DELIVERY" && !deliveryAddress.trim()) {
      setError("Adresse de livraison requise.");
      return;
    }
    setBusy(true);
    setError(null);
    setPendingOrderId(null);
    try {
      const res = await fetch(`${apiBase}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-slug": tenantSlug,
        },
        body: JSON.stringify({
          customerName,
          customerPhone: customerPhone.trim() || undefined,
          fulfillmentType,
          deliveryAddress:
            fulfillmentType === "DELIVERY" ? deliveryAddress.trim() : undefined,
          deliveryCity:
            fulfillmentType === "DELIVERY" ? deliveryCity.trim() || undefined : undefined,
          deliveryPostalCode:
            fulfillmentType === "DELIVERY"
              ? deliveryPostalCode.trim() || undefined
              : undefined,
          deliveryInstructions:
            fulfillmentType === "DELIVERY"
              ? deliveryInstructions.trim() || undefined
              : undefined,
          orderSource: "pos",
          items: lines,
        }),
      });
      const text = await res.text();
      if (!res.ok) {
        setError(text || `Erreur ${res.status}`);
        return;
      }
      const order = JSON.parse(text) as { id: string };
      tajClientLog("pos", "submitOrder ok", order.id);
      setPendingOrderId(order.id);
      setCart({});
    } catch (e) {
      tajClientLog("pos", "submitOrder error", e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function markPaid() {
    tajClientLog("pos", "markPaid click", pendingOrderId, paymentMethod);
    if (!pendingOrderId || !posToken) {
      return;
    }
    if (paymentMethod === "STRIPE") {
      setError(
        "Pour la carte : appelez POST /orders/:id/payment-intent puis Stripe ; le webhook passera la commande en payée.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/orders/${pendingOrderId}/mark-paid`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${posToken}`,
            "Content-Type": "application/json",
            "x-tenant-slug": tenantSlug,
          },
          body: JSON.stringify({ paymentMethod }),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        setError(text || `Erreur ${res.status}`);
        return;
      }
      setPendingOrderId(null);
      tajClientLog("pos", "markPaid ok");
    } catch (e) {
      tajClientLog("pos", "markPaid error", e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pos-layout">
      <header className="pos-header">
        <div>
          <h1>Caisse TAJ</h1>
          <p className="pos-sub">
            Restaurant <strong>{tenantSlug}</strong> · API{" "}
            <code>{apiBase}</code>
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={() => void loadCatalog()}>
          Rafraîchir le menu
        </button>
      </header>

      {promos.length > 0 && (
        <section className="promo-bar">
          {promos
            .filter((p) => p.active)
            .map((p) => (
              <span key={p.id} className="promo-pill">
                {p.title}
                {p.description ? ` — ${p.description}` : ""}
              </span>
            ))}
        </section>
      )}

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="pos-grid">
        <main className="pos-menu">
          {Array.from(grouped.entries()).map(([category, list]) => (
            <section key={category} className="menu-section">
              <h2>{category}</h2>
              <div className="cards">
                {list.map((it) => (
                  <article key={it.id} className="card dish">
                    <div className="dish-img">
                      {it.photoUrl ? (
                        <img
                          src={it.photoUrl}
                          alt={it.name}
                          width={320}
                          height={200}
                          loading="lazy"
                          decoding="async"
                          style={{
                            objectFit: "cover",
                            width: "100%",
                            height: 140,
                            display: "block",
                          }}
                        />
                      ) : (
                        <div className="dish-placeholder">Photo</div>
                      )}
                    </div>
                    <div className="dish-body">
                      <h3>{it.name}</h3>
                      {it.description && (
                        <p className="dish-desc">{it.description}</p>
                      )}
                      <div className="dish-row">
                        <span className="price">{formatEUR(it.priceCents)}</span>
                        <button
                          type="button"
                          className="btn primary sm"
                          onClick={() => addToCart(it.id)}
                        >
                          + Ajouter
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </main>

        <aside className="pos-cart">
          <h2>Panier</h2>

          <div className="pos-login-bar">
            {posToken ? (
              <>
                <span className="pos-logged">Caisse connectée</span>
                <button type="button" className="btn sm ghost" onClick={posLogout}>
                  Déco
                </button>
              </>
            ) : (
              <>
                <span className="pos-log-hint">Connexion pour encaisser</span>
                <input
                  className="pos-login-inp"
                  value={posEmail}
                  onChange={(e) => setPosEmail(e.target.value)}
                  placeholder="Email"
                  autoComplete="username"
                />
                <input
                  className="pos-login-inp"
                  type="password"
                  value={posPassword}
                  onChange={(e) => setPosPassword(e.target.value)}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                />
                <label className="pos-slug-inline">
                  Slug
                  <input
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn sm primary"
                  disabled={busy}
                  onClick={() => void posLogin()}
                >
                  OK
                </button>
              </>
            )}
          </div>

          <label className="field">
            Nom client
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </label>
          <label className="field">
            Téléphone
            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Optionnel"
            />
          </label>

          <div className="fulfill-toggle">
            <button
              type="button"
              className={fulfillmentType === "PICKUP" ? "active" : ""}
              onClick={() => setFulfillmentType("PICKUP")}
            >
              À emporter
            </button>
            <button
              type="button"
              className={fulfillmentType === "DELIVERY" ? "active" : ""}
              onClick={() => setFulfillmentType("DELIVERY")}
            >
              Livraison
            </button>
          </div>

          {fulfillmentType === "DELIVERY" && (
            <>
              <label className="field">
                Adresse
                <input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </label>
              <label className="field">
                Code postal
                <input
                  value={deliveryPostalCode}
                  onChange={(e) => setDeliveryPostalCode(e.target.value)}
                />
              </label>
              <label className="field">
                Ville
                <input
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                />
              </label>
              <label className="field">
                Instructions livreur
                <input
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </label>
            </>
          )}

          <ul className="cart-lines">
            {Object.entries(cart).map(([id, qty]) => {
              const it = items.find((x) => x.id === id);
              if (!it || qty <= 0) {
                return null;
              }
              return (
                <li key={id}>
                  <span>
                    {it.name} × {qty}
                  </span>
                  <span>{formatEUR(it.priceCents * qty)}</span>
                  <button
                    type="button"
                    className="btn sm ghost"
                    onClick={() => decFromCart(id)}
                  >
                    −
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="cart-total">
            <span>Total</span>
            <strong>{formatEUR(totalCents)}</strong>
          </div>
          <button
            type="button"
            className="btn primary block"
            disabled={busy || totalCents === 0}
            onClick={() => void submitOrder()}
          >
            {busy ? "Envoi…" : "Créer la commande"}
          </button>

          {pendingOrderId && (
            <div className="pos-encaisse">
              <h3>Encaissement</h3>
              <p className="hint">
                Commande <code>{pendingOrderId.slice(0, 12)}…</code> en attente
                de paiement.
              </p>
              <label className="field">
                Moyen
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn primary block"
                disabled={busy || !posToken || paymentMethod === "STRIPE"}
                onClick={() => void markPaid()}
              >
                {!posToken
                  ? "Connectez la caisse pour encaisser"
                  : "Marquer payée"}
              </button>
            </div>
          )}

          <p className="hint">
            Stripe : <code>POST /orders/:id/payment-intent</code> + webhook →
            payée automatiquement.
          </p>
        </aside>
      </div>
    </div>
  );
}
