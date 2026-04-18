import { getApiBase, getWebPosUrl } from "../lib/siteUrls";

const apiBase = getApiBase();
const posUrl = getWebPosUrl();
const healthUrl = `${apiBase}/health`;
const buildVersion =
  process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "dev";

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
        "401 attendu sans jeton : ajoutez TAJ_PLATFORM_TOKEN (JWT du compte owner) dans .env à la racine du monorepo, puis redémarrez `web-admin`. Sans ce jeton, la liste JSON des tenants reste vide — le reste du portail fonctionne.";
    } else if (!res.ok) {
      error = `L’API a répondu ${res.status} pour GET /platform/tenants — vérifiez les logs de l’API.`;
    } else {
      tenants = (await res.json()) as unknown[];
    }
  } catch {
    error = `Impossible de joindre l’API à ${apiBase} depuis le serveur Next (connexion refusée, mauvaise URL, etc.). Démarrez Postgres (\`docker compose up -d\`), puis l’API (\`pnpm dev:api\`), et ouvrez ${healthUrl} pour confirmer que l’API répond. Ajustez NEXT_PUBLIC_API_URL si l’API n’est pas sur cette base.`;
  }

  return (
    <>
      <nav className="site-nav" aria-label="Navigation principale">
        <a href="/">Accueil</a>
        <a href="/admin">Back-office</a>
        <a href={posUrl}>Caisse</a>
        <a href="/kitchen">Cuisine</a>
      </nav>

      <main className="portal-main">
        <div className="portal-build-bar" role="status">
          <span className="portal-build-label">Version interface</span>
          <span className="portal-build-version">v{buildVersion}</span>
          <span className="portal-build-sep" aria-hidden>
            ·
          </span>
          <a
            className="portal-build-link"
            href={healthUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Vérifier l’API (health)
          </a>
        </div>

        <header className="portal-hero">
          <p className="portal-kicker">Portail restaurant</p>
          <h1>Bienvenue sur Taj Platform</h1>
          <p className="portal-lead">
            Un seul site pour <strong>gérer le restaurant</strong>, prendre les{" "}
            <strong>commandes en caisse</strong> et suivre la{" "}
            <strong>cuisine</strong>. Choisissez ci-dessous l’espace qui vous
            correspond.
          </p>
        </header>

        <ol className="portal-steps" aria-label="Pour commencer">
          <li>
            <span className="portal-step-num">1</span>
            <span>
              Ouvrez le <strong>back-office</strong> pour les menus, promos et
              paramètres.
            </span>
          </li>
          <li>
            <span className="portal-step-num">2</span>
            <span>
              Utilisez la <strong>caisse</strong> pour enregistrer les commandes
              et l’encaissement.
            </span>
          </li>
          <li>
            <span className="portal-step-num">3</span>
            <span>
              L’écran <strong>cuisine</strong> affiche les commandes à préparer.
            </span>
          </li>
        </ol>

        <section className="portal-grid" aria-label="Accès rapides">
          <a href="/admin" className="portal-card portal-card--admin">
            <span className="portal-card-icon" aria-hidden>
              ◆
            </span>
            <h2>Back-office</h2>
            <p>
              Connexion admin restaurant : menu, photos, promotions, livreurs,
              fiche restaurant et statistiques.
            </p>
            <span className="portal-card-cta">Ouvrir le back-office →</span>
          </a>

          <a href={posUrl} className="portal-card portal-card--pos">
            <span className="portal-card-icon" aria-hidden>
              ≡
            </span>
            <h2>Caisse</h2>
            <p>
              Prise de commande, panier, livraison ou à emporter, puis
              encaissement (dont carte Stripe lorsque configuré).
            </p>
            <span className="portal-card-cta">Ouvrir la caisse →</span>
          </a>

          <a href="/kitchen" className="portal-card portal-card--kitchen">
            <span className="portal-card-icon" aria-hidden>
              ✦
            </span>
            <h2>Cuisine</h2>
            <p>
              Connexion ligne cuisine : file des commandes payées, statuts
              préparation et prêt.
            </p>
            <span className="portal-card-cta">Ouvrir l’écran cuisine →</span>
          </a>
        </section>

        <section className="card portal-hint-card">
          <h2>Compte de démonstration</h2>
          <p className="portal-hint-lead">
            Même mot de passe seed pour tous les comptes ci-dessous (souvent{" "}
            <code>ChangeMeDev123!</code> ou la variable <code>SEED_PASSWORD</code>{" "}
            du serveur).
          </p>
          <ul className="portal-hint-list">
            <li>
              <strong>Admin restaurant</strong> : <code>admin@taj.local</code>{" "}
              + restaurant <code>taj-poulet-demo</code> (dans le formulaire
              back-office).
            </li>
            <li>
              <strong>Caisse</strong> : <code>caisse@taj.local</code> + même
              slug.
            </li>
            <li>
              <strong>Cuisine</strong> : <code>cuisine@taj.local</code> + même
              slug.
            </li>
          </ul>
        </section>

        <section className="card portal-secondary">
          <h2>Liens techniques</h2>
          <ul className="portal-links">
            <li>
              API (base utilisée par ce site) : <code>{apiBase}</code>
            </li>
            <li>
              Caisse (URL directe) : <code>{posUrl}</code>
              <span className="muted small">
                {" "}
                — en production, <code>/commandes</code> redirige aussi vers la
                caisse.
              </span>
            </li>
          </ul>
        </section>

        <details className="card portal-dev-details">
          <summary>Données plateforme (JSON, optionnel)</summary>
          <p className="muted small portal-dev-intro">
            Débogage : réponse de <code>GET {apiBase}/platform/tenants</code>{" "}
            (appelée côté serveur Next). Sans{" "}
            <code>TAJ_PLATFORM_TOKEN</code> (JWT owner dans <code>.env</code>),
            l’API renvoie 401 — ce n’est pas une panne. Si le message ci-dessous
            parle de connexion impossible, l’API n’est pas joignable à cette
            base.
          </p>
          {error ? (
            <p className="portal-dev-error" role="alert">
              {error}
            </p>
          ) : (
            <pre className="json-out portal-dev-pre">
              {JSON.stringify(tenants, null, 2)}
            </pre>
          )}
        </details>
      </main>
    </>
  );
}
