import Link from "next/link";

const apiBase =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const posUrl =
  process.env.NEXT_PUBLIC_WEB_POS_URL ?? "http://localhost:3041";

export default async function AdminHome() {
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
    <main>
      <nav className="site-nav">
        <Link href="/">Accueil</Link>
        <Link href="/admin">Console restaurant</Link>
        <Link href="/kitchen">Cuisine (KDS)</Link>
        <a href={posUrl} target="_blank" rel="noreferrer">
          Caisse
        </a>
      </nav>
      <h1>Taj Platform — Back-office</h1>
      <p>
        Données démo : menu avec <strong>photos Unsplash</strong>, catégories,
        promotions. Identifiants seed :{" "}
        <code>admin@taj.local</code> / <code>ChangeMeDev123!</code>, slug{" "}
        <code>taj-poulet-demo</code>.
      </p>
      <div className="card">
        <h2>Restaurants (SSR, jeton optionnel)</h2>
        <p>
          API : <code>{apiBase}</code>
        </p>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <pre style={{ overflow: "auto" }}>
            {JSON.stringify(tenants, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}
