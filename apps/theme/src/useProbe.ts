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
export const client = new KomariClient();
export const isDemo = import.meta.env.VITE_DATA_MODE === "demo";
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
        stop = subscribeLive(setLive, setConnection);
      })
      .catch((e) => {
        if (active)
          setError(
            controller.signal.reason?.name === "TimeoutError"
              ? "连接超时，请检查本地 Komari"
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
