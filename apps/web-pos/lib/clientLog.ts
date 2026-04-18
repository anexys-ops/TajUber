/** Logs navigateur : actifs en dev, ou si `NEXT_PUBLIC_DEBUG_UI=1` (prod). */
export function tajClientLog(scope: string, ...args: unknown[]): void {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEBUG_UI === "1"
  ) {
    // eslint-disable-next-line no-console
    console.info(`[taj-web-pos:${scope}]`, ...args);
  }
}
