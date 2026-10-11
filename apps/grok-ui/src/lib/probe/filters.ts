import type { RangeKey, RegionId } from "./types";

export const REGION_FILTERS = ["all", "hk", "tyo", "sin", "lax", "fra"] as const;
export type RegionFilter = (typeof REGION_FILTERS)[number];

export interface FleetSearch {
  q: string;
  region: RegionFilter;
  provider: string;
  status: "all" | "online" | "offline" | "issue";
  view: "ledger" | "cards";
  sort: "region" | "cpu" | "ping" | "traffic";
}

export const FLEET_DEFAULTS: FleetSearch = {
  q: "",
  region: "all",
  provider: "all",
  status: "all",
  view: "ledger",
  sort: "region",
};

function isRegion(value: unknown): value is RegionFilter {
  return typeof value === "string" && (REGION_FILTERS as readonly string[]).includes(value);
}

export function parseFleetSearch(search: Record<string, unknown>): FleetSearch {
  const status = search.status;
  const view = search.view;
  const sort = search.sort;
  return {
    q: typeof search.q === "string" ? search.q : "",
    region: isRegion(search.region) ? search.region : "all",
    provider: typeof search.provider === "string" && search.provider ? search.provider : "all",
    status: status === "online" || status === "offline" || status === "issue" ? status : "all",
    view: view === "cards" ? "cards" : "ledger",
    sort: sort === "cpu" || sort === "ping" || sort === "traffic" ? sort : "region",
  };
}

export function isRegionId(value: RegionFilter): value is RegionId {
  return value !== "all";
}

export function parseRange(search: Record<string, unknown>): { range: RangeKey } {
  const range = search.range;
  if (range === "1h" || range === "6h" || range === "24h" || range === "7d") {
    return { range };
  }
  return { range: "6h" };
}
