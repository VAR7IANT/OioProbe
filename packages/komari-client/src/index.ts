export type NodeInfo = {
  uuid: string;
  name: string;
  region: string;
  group: string;
  tags: string[];
  os: string;
  cpuName: string;
  cores: number;
  memoryTotal: number;
  diskTotal: number;
  weight: number;
};
export type Report = {
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  up: number | null;
  down: number | null;
  totalUp: number | null;
  totalDown: number | null;
  uptime: number | null;
  updatedAt: string;
};
export type LiveSnapshot = {
  online: string[];
  reports: Record<string, Report>;
};
export type SiteInfo = {
  name: string;
  description: string;
  privateSite: boolean;
};
export type HistoryPoint = {
  time: string;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  up: number | null;
  down: number | null;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError("接口数据格式不兼容");
  return value as Record<string, unknown>;
}
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
export function unwrap(value: unknown): unknown {
  const v = object(value);
  if (v.status !== "success")
    throw new ApiError(str(v.message) || str(v.error) || "接口返回错误");
  return v.data;
}
export function parseNodes(value: unknown): NodeInfo[] {
  if (!Array.isArray(value)) throw new ApiError("节点列表格式不兼容");
  return value
    .map((item) => {
      const n = object(item);
      if (!str(n.uuid)) throw new ApiError("节点缺少 UUID");
      return {
        uuid: str(n.uuid),
        name: str(n.name) || "未命名节点",
        region: str(n.region),
        group: str(n.group) || "未分组",
        tags: str(n.tags).split(";").filter(Boolean),
        os: str(n.os),
        cpuName: str(n.cpu_name),
        cores: num(n.cpu_cores) ?? 0,
        memoryTotal: num(n.mem_total) ?? 0,
        diskTotal: num(n.disk_total) ?? 0,
        weight: num(n.weight) ?? 0,
      };
    })
    .sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}
export function parseSite(value: unknown): SiteInfo {
  const v = object(value);
  return {
    name: str(v.sitename) || "OioProbe",
    description: str(v.description),
    privateSite: v.private_site === true,
  };
}
export function parseLive(value: unknown): LiveSnapshot {
  const v = object(value);
  if (!Array.isArray(v.online) || v.online.some((x) => typeof x !== "string"))
    throw new ApiError("在线列表格式不兼容");
  const raw = object(v.data);
  const reports: Record<string, Report> = Object.create(null);
  for (const [uuid, item] of Object.entries(raw)) {
    const r = object(item),
      cpu = object(r.cpu),
      ram = object(r.ram),
      disk = object(r.disk),
      network = object(r.network);
    reports[uuid] = {
      cpu: num(cpu.usage),
      memory: num(ram.used),
      disk: num(disk.used),
      up: num(network.up),
      down: num(network.down),
      totalUp: num(network.totalUp),
      totalDown: num(network.totalDown),
      uptime: num(r.uptime),
      updatedAt: str(r.updated_at),
    };
  }
  return { online: v.online as string[], reports };
}
export function parseHistory(value: unknown): HistoryPoint[] {
  const v = object(value);
  if (v.records === null) return [];
  if (!Array.isArray(v.records)) throw new ApiError("历史数据格式不兼容");
  return v.records.map((item) => {
    const r = object(item);
    return {
      time: str(r.time),
      cpu: num(r.cpu),
      memory: num(r.ram),
      disk: num(r.disk),
      up: num(r.net_out),
      down: num(r.net_in),
    };
  });
}
export function percent(
  used: number | null | undefined,
  total: number,
): number | null {
  return used == null || total <= 0
    ? null
    : Math.min(100, Math.max(0, (used / total) * 100));
}
export function nodeStatus(
  uuid: string,
  live: LiveSnapshot | null,
  now = Date.now(),
): "online" | "offline" | "stale" | "unknown" {
  if (!live) return "unknown";
  if (!live.online.includes(uuid)) return "offline";
  const t = Date.parse(live.reports[uuid]?.updatedAt ?? "");
  return Number.isFinite(t) && now - t <= 15000 && t - now <= 5000
    ? "online"
    : "stale";
}
export class KomariClient {
  constructor(private fetcher: typeof fetch = (...args) => fetch(...args)) {}
  async get(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await this.fetcher(path, {
      credentials: "same-origin",
      signal: signal ?? AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new ApiError(
        response.status === 401
          ? "此站点需要登录"
          : `接口请求失败 (${response.status})`,
        response.status,
      );
    let value: unknown;
    try {
      value = await response.json();
    } catch {
      throw new ApiError("接口未返回 JSON，请检查 Komari 代理");
    }
    return unwrap(value);
  }
  async nodes(signal?: AbortSignal) {
    return parseNodes(await this.get("/api/nodes", signal));
  }
  async site(signal?: AbortSignal) {
    return parseSite(await this.get("/api/public", signal));
  }
  async version(signal?: AbortSignal) {
    const v = object(await this.get("/api/version", signal));
    return { version: str(v.version), hash: str(v.hash) };
  }
  async history(uuid: string, hours = 4, signal?: AbortSignal) {
    if (!Number.isInteger(hours) || hours < 1 || hours > 168)
      throw new ApiError("无效的时间范围");
    return parseHistory(
      await this.get(
        `/api/records/load?${new URLSearchParams({ uuid, hours: String(hours), load_type: "all" })}`,
        signal,
      ),
    );
  }
  async ping(uuid: string, hours = 4, signal?: AbortSignal) {
    return this.get(
      `/api/records/ping?${new URLSearchParams({ uuid, hours: String(hours) })}`,
      signal,
    );
  }
  async pingTasks(signal?: AbortSignal) {
    return this.get("/api/task/ping", signal);
  }
}
export type ConnectionState =
  "connecting" | "connected" | "reconnecting" | "error";
export type SocketLike = Pick<
  WebSocket,
  | "readyState"
  | "send"
  | "close"
  | "onopen"
  | "onmessage"
  | "onerror"
  | "onclose"
>;
export function subscribeLive(
  onData: (value: LiveSnapshot) => void,
  onState: (state: ConnectionState) => void,
  options: {
    url?: string;
    factory?: (url: string) => SocketLike;
    interval?: number;
  } = {},
) {
  const url =
    options.url ??
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/clients`;
  const factory = options.factory ?? ((url) => new WebSocket(url));
  let disposed = false,
    socket: SocketLike | undefined,
    retry = 0,
    poll: ReturnType<typeof setInterval> | undefined,
    reconnect: ReturnType<typeof setTimeout> | undefined,
    lastReply = Date.now();
  const stopPoll = () => {
    if (poll) clearInterval(poll);
    poll = undefined;
  };
  const connect = () => {
    if (disposed) return;
    onState(retry ? "reconnecting" : "connecting");
    try {
      socket = factory(url);
    } catch {
      schedule();
      return;
    }
    socket.onopen = () => {
      if (disposed) return;
      lastReply = Date.now();
      socket?.send("get");
      stopPoll();
      poll = setInterval(() => {
        if (Date.now() - lastReply > 12000) {
          socket?.close();
          return;
        }
        if (socket?.readyState === 1) socket.send("get");
      }, options.interval ?? 1000);
    };
    socket.onmessage = (event) => {
      try {
        const data = parseLive(unwrap(JSON.parse(String(event.data))));
        lastReply = Date.now();
        retry = 0;
        onData(data);
        onState("connected");
      } catch {
        onState("error");
        socket?.close();
      }
    };
    socket.onerror = () => {
      onState("error");
      socket?.close();
    };
    socket.onclose = () => {
      stopPoll();
      schedule();
    };
  };
  function schedule() {
    if (disposed) return;
    onState("reconnecting");
    if (reconnect) clearTimeout(reconnect);
    reconnect = setTimeout(connect, Math.min(30000, 1000 * 2 ** retry++));
  }
  connect();
  return () => {
    disposed = true;
    stopPoll();
    if (reconnect) clearTimeout(reconnect);
    if (socket) {
      socket.onclose = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.close();
    }
  };
}
