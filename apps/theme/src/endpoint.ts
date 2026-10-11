/**
 * Vercel is a static front end; Komari remains on a separate HTTPS origin.
 * No credentials, admin tokens, or authentication cookies are forwarded.
 * The regular Komari theme build keeps same-origin behavior.
 */
export function resolveKomariOrigin(
  deployment: "vercel" | "komari",
  rawOrigin: string | undefined,
  pageOrigin: string,
): string | null {
  if (deployment === "komari") return pageOrigin;
  if (!rawOrigin?.trim()) return null;
  try {
    const url = new URL(rawOrigin.trim());
    if (
      url.protocol !== "https:" ||
      url.username || url.password ||
      url.pathname !== "/" ||
      url.search || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function publicApiUrl(origin: string, path: string): string {
  if (!path.startsWith("/api/") || path.startsWith("//"))
    throw new Error("只允许请求公开 Komari API 路径");
  return new URL(path, origin).toString();
}

export function publicSocketUrl(origin: string): string {
  const url = new URL("/api/clients", origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function nativeAdminUrl(origin: string): string {
  return new URL("/admin", origin).toString();
}
