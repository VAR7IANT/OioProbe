/** View model used by the UI. Produced only through the Komari adapter. */

export type RegionId = "hk" | "tyo" | "sin" | "lax" | "fra";
export type Health = "online" | "watch" | "critical" | "offline";
export type RangeKey = "1h" | "6h" | "24h" | "7d";

export interface HistoryPoint {
  label: string;
  cpu: number;
  mem: number;
  /** MB/s */
  up: number;
  /** MB/s */
  down: number;
  ping: number | null;
  loss: number | null;
}

export interface ProbeNode {
  id: string;
  name: string;
  region: RegionId;
  regionLabel: string;
  country: string;
  provider: string;
  remark: string;
  online: boolean;
  health: Health;
  issue: string | null;
  cpu: number;
  mem: number;
  disk: number;
  /** bytes/s */
  netUp: number;
  netDown: number;
  netTotalUp: number;
  netTotalDown: number;
  ping: number | null;
  loss: number | null;
  pingTarget: string | null;
  uptimeSec: number;
  lastSeenLabel: string;
  os: string;
  arch: string;
  kernel: string;
  cpuName: string;
  cores: number;
  memTotal: number;
  diskTotal: number;
  load1: number;
  load5: number;
  load15: number;
  process: number;
  connections: number;
  connectionsUdp: number;
  ipv4: string;
  ipv6: string;
  virt: string;
  temp: number | null;
  history: Record<RangeKey, HistoryPoint[]>;
}

/**
 * Shapes documented by Komari's public API
 * (GET /api/nodes, status records, GET /api/clients WebSocket "get",
 * GET /api/recent/:uuid, ping records). Field names follow that contract
 * so a live source can be swapped in without touching the view.
 */
export interface KomariClient {
  uuid: string;
  name: string;
  cpu_name: string;
  virtualization: string;
  arch: string;
  cpu_cores: number;
  os: string;
  kernel_version: string;
  ipv4: string;
  ipv6: string;
  region: string;
  mem_total: number;
  disk_total: number;
  group: string;
  tags: string;
  public_remark: string;
}

export interface KomariRecord {
  client: string;
  time: string;
  cpu: number;
  ram: number;
  ram_total: number;
  load: number;
  load5: number;
  load15: number;
  disk: number;
  disk_total: number;
  net_in: number;
  net_out: number;
  net_total_up: number;
  net_total_down: number;
  process: number;
  connections: number;
  connections_udp: number;
  temp: number | null;
}

export interface KomariPingSample {
  time: string;
  target: string;
  latest: number;
  loss: number;
}

export interface KomariBundle {
  client: KomariClient;
  online: boolean;
  /** Agent-reported uptime in seconds. Historical records do not carry it. */
  uptimeSec: number;
  /** Last report. Present for offline nodes as the pre-disconnect snapshot. */
  latest: KomariRecord;
  recent: Record<RangeKey, KomariRecord[]>;
  ping: Record<RangeKey, KomariPingSample[]>;
  /** Fixed demo clock. Live mode would use the report timestamp. */
  observedAt: string;
}
