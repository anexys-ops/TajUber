type AppFooterProps = {
  /** Permet de distinguer portail et caisse dans le libellé. */
  product?: "portail" | "caisse";
};

function readVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "dev";
}

export function AppFooter({ product = "portail" }: AppFooterProps) {
  const version = readVersion();
  const productLabel =
    product === "caisse" ? "Caisse web" : "Portail web";

  return (
    <footer className="app-footer" role="contentinfo">
      <div className="app-footer-inner">
        <div className="app-footer-brand">
          <span className="app-footer-title">Taj Platform</span>
          <span className="app-footer-sep" aria-hidden>
            ·
          </span>
          <span className="app-footer-product">{productLabel}</span>
        </div>
        <div className="app-footer-version-row" aria-label="Version déployée">
          <span className="app-footer-version-badge">v{version}</span>
          <span className="app-footer-version-hint">
            Contrôle déploiement : ce numéro doit suivre{" "}
            <code className="app-footer-code">version.txt</code> après chaque
            mise en ligne.
          </span>
        </div>
      </div>
    </footer>
  );
}
