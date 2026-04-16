export function AppFooter() {
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "dev";
  return (
    <footer className="app-footer" role="contentinfo">
      <span>Taj Platform — Caisse</span>
      <span className="app-footer-sep" aria-hidden>
        ·
      </span>
      <span className="app-footer-version">v{version}</span>
    </footer>
  );
}
