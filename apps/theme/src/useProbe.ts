import { useCallback, useEffect, useState } from "react";
import {
  KomariClient,
  subscribeLive,
  type NodeInfo,
  type SiteInfo,
  type LiveSnapshot,
  type ConnectionState,
} from "@oioprobe/komari-client";
import { demoNodes, demoLive } from "./demo";
import { resolveKomariOrigin, publicApiUrl, publicSocketUrl, nativeAdminUrl } from "./endpoint";
export const isVercel = import.meta.env.VITE_DEPLOY_TARGET === "vercel";
export const komariOrigin = resolveKomariOrigin(
  isVercel ? "vercel" : "komari",
  import.meta.env.VITE_KOMARI_ORIGIN,
  typeof window === "undefined" ? "http://127.0.0.1" : window.location.origin,
);
export const adminHref = komariOrigin ? nativeAdminUrl(komariOrigin) : null;
export const isDemo = !isVercel && import.meta.env.VITE_DATA_MODE === "demo";
export const client = new KomariClient((input, init) => {
  if (!komariOrigin)
    return Promise.reject(new Error("尚未配置 NAT VPS 的 Komari HTTPS 地址：请在 Vercel 设置 VITE_KOMARI_ORIGIN 并重新部署。"));
  return fetch(publicApiUrl(komariOrigin, String(input)), {
    ...init,
    // Vercel only reads public status APIs; never send admin session cookies cross-site.
    credentials: isVercel ? "omit" : "same-origin",
  });
});
export function useProbe() {
  const [nodes, setNodes] = useState<NodeInfo[]>([]),
    [site, setSite] = useState<SiteInfo | null>(null),
    [live, setLive] = useState<LiveSnapshot | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [connection, setConnection] = useState<ConnectionState>("connecting"),
    [attempt, setAttempt] = useState(0),
    [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const tick = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);
  useEffect(() => {
    if (isDemo) {
      setNodes(demoNodes);
      setSite({
        name: "OioProbe",
        description: "Your servers, at a glance.",
        privateSite: false,
      });
      setLive(demoLive());
      setLoading(false);
      setConnection("connected");
      const timer = setInterval(() => setLive(demoLive()), 1000);
      return () => clearInterval(timer);
    }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(
      () => controller.abort(new DOMException("连接超时", "TimeoutError")),
      10000,
    );
    let stop: (() => void) | undefined;
    setLoading(true);
    setError("");
    setLive(null);
    setConnection("connecting");
    Promise.all([
      client.nodes(controller.signal),
      client.site(controller.signal),
    ])
      .then(([n, s]) => {
        if (!active) return;
        setNodes(n);
        setSite(s);
        if (!komariOrigin) return;
        stop = subscribeLive(setLive, setConnection, {
          url: publicSocketUrl(komariOrigin),
        });
      })
      .catch((e) => {
        if (active)
          setError(
            controller.signal.reason?.name === "TimeoutError"
              ? (isVercel ? "连接超时：请检查 Cloudflare Tunnel 和 Komari HTTPS 地址" : "连接超时，请检查本地 Komari")
              : e instanceof Error
                ? e.message
                : "连接失败",
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
      stop?.();
    };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { nodes, site, live, loading, error, connection, retry, clock };
}
