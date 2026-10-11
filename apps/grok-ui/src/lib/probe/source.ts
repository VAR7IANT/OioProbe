import { adaptFleet } from "./adapter";
import { DEMO_BUNDLES } from "./mock";
import type { ProbeNode } from "./types";

/**
 * Data boundary. The UI talks to ProbeSource, never to raw fixtures.
 * `mode: "mock"` must stay visible in the product — simulated numbers are
 * not a live Komari feed.
 */
export interface ProbeSource {
  readonly mode: "mock" | "komari";
  load(): Promise<ProbeNode[]>;
}

export const KOMARI_ENDPOINTS = {
  nodes: "/api/nodes",
  recent: "/api/recent/:uuid",
  ping: "/api/records/ping",
  /** WebSocket. On open, send the text frame `get` for all visible nodes. */
  liveSocket: "/api/clients",
} as const;

export const mockProbeSource: ProbeSource = {
  mode: "mock",
  async load() {
    await new Promise((resolve) => {
      setTimeout(resolve, 680);
    });
    return adaptFleet(DEMO_BUNDLES);
  },
};

/**
 * Reserved live source. Construct with the panel origin when a real Komari
 * kernel is available. This demo never instantiates it and never embeds a token.
 *
 * Mapping lives in `adaptBundle`. Suggested sequence:
 *   1. GET  {origin}/api/nodes
 *   2. WS   {origin}/api/clients   → send "get" for latest status
 *   3. GET  {origin}/api/recent/:uuid for each visible node
 *   4. GET  {origin}/api/records/ping when a ping task exists
 */
export function komariSourcePlaceholder(origin: string): ProbeSource {
  return {
    mode: "komari",
    async load() {
      throw new Error(
        `Komari 源未连接（${origin}${KOMARI_ENDPOINTS.nodes}）。当前演示只使用本地模拟数据。`,
      );
    },
  };
}
