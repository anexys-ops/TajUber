"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminDriversTab } from "./AdminDriversTab";
import { AdminMenuCrud } from "./AdminMenuCrud";
import { AdminPromosCrud } from "./AdminPromosCrud";
import { AdminRestaurantTab } from "./AdminRestaurantTab";
import { AdminSalesTab } from "./AdminSalesTab";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const posUrl =
  process.env.NEXT_PUBLIC_WEB_POS_URL ?? "http://localhost:3041";

const TOKEN_KEY = "taj_admin_jwt";
const SLUG_KEY = "taj_tenant_slug";

function scopeFromJwt(jwt: string): "tenant" | "platform" | null {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) {
      return null;
    }
    const json = JSON.parse(atob(payload)) as { scope?: string };
    return json.scope === "platform" ? "platform" : "tenant";
  } catch {
    return null;
  }
}

function tenantRoleFromJwt(jwt: string): string | null {
  try {
    const json = JSON.parse(atob(jwt.split(".")[1])) as { role?: string };
    return json.role ?? null;
  } catch {
    return null;
  }
}

export default function AdminConsolePage() {
  const [email, setEmail] = useState("admin@taj.local");
  const [password, setPassword] = useState("ChangeMeDev123!");
  const [tenantSlug, setTenantSlug] = useState("taj-poulet-demo");
  const [platformOnly, setPlatformOnly] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [sessionScope, setSessionScope] = useState<"none" | "tenant" | "platform">(
    "none",
  );
  const [tab, setTab] = useState<
    | "menu"
    | "promos"
    | "drivers"
    | "restaurant"
    | "sales"
    | "platform"
  >("menu");
  const [tenantsJson, setTenantsJson] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    const s = sessionStorage.getItem(SLUG_KEY);
    if (t) {
      setToken(t);
      const sc = scopeFromJwt(t);
      if (sc) {
        setSessionScope(sc);
        setTab(sc === "platform" ? "platform" : "menu");
      }
    }
    if (s) {
      setTenantSlug(s);
    }
  }, []);

  const login = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const body: Record<string, string> = {
        email,
        password,
      };
      if (!platformOnly) {
        body.tenantSlug = tenantSlug;
      }
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        access_token?: string;
        message?: string;
        scope?: string;
      };
      if (!res.ok || !data.access_token) {
        setMessage(data.message ?? `Erreur ${res.status}`);
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.setItem(SLUG_KEY, tenantSlug);
      setToken(data.access_token);
      if (data.scope === "platform") {
        setSessionScope("platform");
        setTab("platform");
      } else {
        setSessionScope("tenant");
        setTab("menu");
      }
      setMessage("Connecté.");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }, [email, password, tenantSlug, platformOnly]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setSessionScope("none");
    setTenantsJson("");
  }, []);

  const loadTenants = useCallback(async () => {
    if (!token) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/platform/tenants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTenantsJson(await res.text());
      if (!res.ok) {
        setMessage(`Plateforme : ${res.status}`);
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (sessionScope === "platform" && tab === "platform") {
      void loadTenants();
    }
  }, [token, tab, sessionScope, loadTenants]);

  const tenantRole = token ? tenantRoleFromJwt(token) : null;
  const isTenantAdmin = tenantRole === "TENANT_ADMIN";

  useEffect(() => {
    if (sessionScope === "tenant" && tab === "drivers" && !isTenantAdmin) {
      setTab("menu");
    }
  }, [sessionScope, tab, isTenantAdmin]);

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div>
          <h1>Console restaurant</h1>
          <p className="muted">
            Menu, fiche restaurant, stats ·{" "}
            <Link href="/">accueil</Link>
            {" · "}
            <Link href="/kitchen">cuisine</Link>
            {" · "}
            <a href={posUrl} target="_blank" rel="noreferrer">
              caisse
            </a>
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
          <h2>Connexion</h2>
          <p className="muted small">
            Démo : <code>admin@taj.local</code> / <code>ChangeMeDev123!</code>{" "}
            + slug <code>taj-poulet-demo</code>. Plateforme :{" "}
            <code>owner@taj.local</code> (cochez « Compte plateforme »).
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
          <label className="check">
            <input
              type="checkbox"
              checked={platformOnly}
              onChange={(e) => setPlatformOnly(e.target.checked)}
            />
            Compte plateforme (owner) — sans slug restaurant
          </label>
          {!platformOnly && (
            <label className="field">
              Slug restaurant
              <input
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
              />
            </label>
          )}
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
          <nav className="tabs">
            {sessionScope === "tenant" && (
              <>
                <button
                  type="button"
                  className={tab === "menu" ? "active" : ""}
                  onClick={() => setTab("menu")}
                >
                  Menu & photos
                </button>
                <button
                  type="button"
                  className={tab === "promos" ? "active" : ""}
                  onClick={() => setTab("promos")}
                >
                  Promotions
                </button>
                {isTenantAdmin && (
                  <button
                    type="button"
                    className={tab === "drivers" ? "active" : ""}
                    onClick={() => setTab("drivers")}
                  >
                    Livreurs
                  </button>
                )}
                <button
                  type="button"
                  className={tab === "restaurant" ? "active" : ""}
                  onClick={() => setTab("restaurant")}
                >
                  Restaurant &amp; paiements
                </button>
                <button
                  type="button"
                  className={tab === "sales" ? "active" : ""}
                  onClick={() => setTab("sales")}
                >
                  Ventes
                </button>
              </>
            )}
            {sessionScope === "platform" && (
              <button
                type="button"
                className={tab === "platform" ? "active" : ""}
                onClick={() => setTab("platform")}
              >
                Restaurants
              </button>
            )}
          </nav>

          {message && (
            <div className="banner" role="status">
              {message}
            </div>
          )}

          {tab === "menu" && sessionScope === "tenant" && token && (
            <>
              {!isTenantAdmin && (
                <p className="muted small">
                  Compte caisse : consultation du menu uniquement. CRUD réservé
                  à l’admin restaurant.
                </p>
              )}
              <AdminMenuCrud
                apiBase={apiBase}
                token={token}
                tenantSlug={tenantSlug}
                canMutate={isTenantAdmin}
              />
            </>
          )}

          {tab === "promos" && sessionScope === "tenant" && token && (
            <>
              {!isTenantAdmin && (
                <p className="muted small">
                  Compte caisse : liste des promotions en lecture seule.
                </p>
              )}
              <AdminPromosCrud
                apiBase={apiBase}
                token={token}
                tenantSlug={tenantSlug}
                canMutate={isTenantAdmin}
              />
            </>
          )}

          {tab === "drivers" &&
            sessionScope === "tenant" &&
            token &&
            isTenantAdmin && (
              <AdminDriversTab
                apiBase={apiBase}
                token={token}
                tenantSlug={tenantSlug}
              />
            )}

          {tab === "restaurant" && sessionScope === "tenant" && token && (
            <AdminRestaurantTab
              apiBase={apiBase}
              token={token}
              tenantSlug={tenantSlug}
            />
          )}

          {tab === "sales" && sessionScope === "tenant" && token && (
            <AdminSalesTab
              apiBase={apiBase}
              token={token}
              tenantSlug={tenantSlug}
            />
          )}

          {tab === "platform" && sessionScope === "platform" && (
            <section className="card">
              <h2>GET /platform/tenants</h2>
              <p className="muted small">
                Nécessite un JWT owner. Sinon erreur 403.
              </p>
              <button type="button" className="btn ghost" onClick={() => void loadTenants()}>
                Rafraîchir
              </button>
              <pre className="json-out">{tenantsJson}</pre>
            </section>
          )}
        </>
      )}
    </div>
  );
}
