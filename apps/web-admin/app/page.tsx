import Link from "next/link";
import { getApiBase, getWebPosUrl } from "../lib/siteUrls";

const apiBase = getApiBase();
const posUrl = getWebPosUrl();

export default async function HomePortal() {
  const token = process.env.TAJ_PLATFORM_TOKEN;
  let tenants: unknown[] = [];
  let error: string | null = null;
  try {
    const res = await fetch(`${apiBase}/platform/tenants`, {
      next: { revalidate: 0 },
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
    });
    if (res.status === 401) {
      error =
        "401 — optionnel : TAJ_PLATFORM_TOKEN pour lister les tenants sans login UI.";
    } else if (!res.ok) {
      error = `API ${res.status}`;
    } else {
      tenants = (await res.json()) as unknown[];
    }
  } catch {
    error = "API injoignable — démarrez Postgres puis `pnpm dev:api`.";
  }

  return (
    <>
      <nav className="site-nav" aria-label="Navigation principale">
        <Link href="/">Accueil</Link>
        <Link href="/admin">Back-office</Link>
        <a href={posUrl}>Commandes (caisse)</a>
        <Link href="/kitchen">Cuisine</Link>
      </nav>
      <main>
        <header className="portal-hero">
          <p className="portal-kicker">taj.apps-dev.fr</p>
          <h1>Taj Platform</h1>
          <p className="portal-lead">
            Accédez au <strong>back-office</strong> (menus, promos, restaurant)
            et au <strong>front de prise de commande</strong> (caisse web),
            sur le même site.
          </p>
        </header>

        <section className="portal-grid" aria-label="Accès rapides">
          <Link href="/admin" className="portal-card portal-card--admin">
            <span className="portal-card-icon" aria-hidden>
              ◆
            </span>
            <h2>Back-office</h2>
            <p>
              Console restaurant : menu, promotions, livreurs, stats,
              paramètres.
            </p>
            <span className="portal-card-cta">Ouvrir la console →</span>
          </Link>

          <a href={posUrl} className="portal-card portal-card--pos">
            <span className="portal-card-icon" aria-hidden>
              ≡
            </span>
            <h2>Commandes (caisse)</h2>
            <p>
              Interface caisse pour enregistrer les commandes, encaissement et
              flux vers la cuisine.
            </p>
            <span className="portal-card-cta">Ouvrir la caisse →</span>
          </a>
        </section>

        <section className="card portal-secondary">
          <h2>Autres accès</h2>
          <ul className="portal-links">
            <li>
              <Link href="/kitchen">Écran cuisine (KDS)</Link>
            </li>
            <li>
              API : <code>{apiBase}</code>
            </li>
            <li>
              Caisse : <code>{posUrl}</code>{" "}
              <span className="muted small">
                (en prod, <code>/commandes</code> redirige aussi vers la caisse)
              </span>
            </li>
          </ul>
          <p className="muted small" style={{ marginTop: "1rem" }}>
            Démo seed : <code>admin@taj.local</code> /{" "}
            <code>ChangeMeDev123!</code>, tenant{" "}
            <code>taj-poulet-demo</code>.
          </p>
        </section>

        <section className="card">
          <h2>Restaurants (SSR, jeton optionnel)</h2>
          {error ? (
            <p role="alert">{error}</p>
          ) : (
            <pre className="json-out" style={{ marginTop: "0.75rem" }}>
              {JSON.stringify(tenants, null, 2)}
            </pre>
          )}
        </section>
      </main>
    </>
  );
}
