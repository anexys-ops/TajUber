/** Base API (build-time env). */
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:3001";
}

/**
 * URL de la caisse / prise de commande (app Next `web-pos`).
 * En production Docker, même domaine que l’admin (ex. …/pos).
 */
export function getWebPosUrl(): string {
  return (
    process.env.NEXT_PUBLIC_WEB_POS_URL?.trim() || "http://localhost:3041"
  );
}
