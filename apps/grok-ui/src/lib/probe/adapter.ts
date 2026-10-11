import { formatUptimeShort } from "./format";
import { classify, describeIssue } from "./health";
import type {
  HistoryPoint,
  KomariBundle,
  KomariPingSample,
  KomariRecord,
  ProbeNode,
  RangeKey,
  RegionId,
} from "./types";

/**
 * Komari → OioProbe view model.
 *
 * Intended live wiring (not connected in this demo):
 *   GET  /api/nodes                  visible clients
 *   WS   /api/clients  send "get"    latest status map
 *   GET  /api/recent/:uuid           cpu / ram / net history
 *   GET  /api/records/ping           latency and loss, when a ping task exists
 *
 * Bytes stay bytes until the view formats them. CPU in Komari records is
 * already a percent; ram and disk are bytes.
 */

const REGIONS: Record<string, { id: RegionId; country: string; label: string }> = {
  香港: { id: "hk", country: "HK", label: "香港" },
  东京: { id: "tyo", country: "JP", label: "东京" },
  新加坡: { id: "sin", country: "SG", label: "新加坡" },
  洛杉矶: { id: "lax", country: "US", label: "洛杉矶" },
  法兰克福: { id: "fra", country: "DE", label: "法兰克福" },
};

const RANGES: RangeKey[] = ["1h", "6h", "24h", "7d"];

/** Fixed UTC+8 labels so server and browser render the same axis. */
function labelFromIso(iso: string, withDate: boolean): string {
  const shifted = new Date(Date.parse(iso) + 8 * 3600_000);
  if (Number.isNaN(shifted.getTime())) return "";
  if (withDate) return `${shifted.getUTCMonth() + 1}/${shifted.getUTCDate()}`;
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function ago(fromIso: string, nowIso: string): string {
  const seconds = Math.max(0, Math.round((Date.parse(nowIso) - Date.parse(fromIso)) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);
  if (days >= 1) return `${days}天前`;
  if (hours >= 1) return `${hours}小时前`;
  if (minutes >= 1) return `${minutes}分钟前`;
  return "刚刚";
}

function percent(used: number, total: number): number {
  if (!total) return 0;
  return Math.round((used / total) * 1000) / 10;
}

function toMb(bytesPerSec: number): number {
  return Math.round((bytesPerSec / 1024 / 1024) * 1000) / 1000;
}

function providerFromTags(tags: string): string {
  const first = tags.split(/[;,]/).map((part) => part.trim()).find(Boolean);
  return first || "未标记";
}

function alignPing(samples: KomariPingSample[], time: string): { ping: number | null; loss: number | null } {
  const sample = samples.find((item) => item.time === time) ?? samples.at(-1);
  if (!sample) return { ping: null, loss: null };
  return { ping: sample.latest, loss: sample.loss };
}

function toPoints(records: KomariRecord[], pings: KomariPingSample[], withDate: boolean): HistoryPoint[] {
  return records.map((record) => {
    const ping = alignPing(pings, record.time);
    return {
      label: labelFromIso(record.time, withDate),
      cpu: record.cpu,
      mem: percent(record.ram, record.ram_total),
      up: toMb(record.net_out),
      down: toMb(record.net_in),
      ping: ping.ping,
      loss: ping.loss,
    };
  });
}

export function adaptBundle(bundle: KomariBundle): ProbeNode {
  const region = REGIONS[bundle.client.group] ?? {
    id: "hk" as RegionId,
    country: bundle.client.region || "—",
    label: bundle.client.group || "未分组",
  };
  const latestPing = bundle.ping["1h"].at(-1) ?? null;
  const cpu = bundle.latest.cpu;
  const mem = percent(bundle.latest.ram, bundle.latest.ram_total);
  const disk = percent(bundle.latest.disk, bundle.latest.disk_total);
  const ping = latestPing ? latestPing.latest : null;
  const loss = latestPing ? latestPing.loss : null;
  const online = bundle.online;

  const history = RANGES.reduce(
    (accumulator, range) => {
      accumulator[range] = toPoints(bundle.recent[range], bundle.ping[range], range === "7d");
      return accumulator;
    },
    {} as Record<RangeKey, HistoryPoint[]>,
  );

  return {
    id: bundle.client.uuid,
    name: bundle.client.name,
    region: region.id,
    regionLabel: region.label,
    country: region.country,
    provider: providerFromTags(bundle.client.tags),
    remark: bundle.client.public_remark,
    online,
    health: classify({ online, cpu, mem, disk, ping, loss }),
    issue: describeIssue({ online, cpu, mem, disk, ping, loss }),
    cpu,
    mem,
    disk,
    netUp: bundle.latest.net_out,
    netDown: bundle.latest.net_in,
    netTotalUp: bundle.latest.net_total_up,
    netTotalDown: bundle.latest.net_total_down,
    ping,
    loss,
    pingTarget: latestPing?.target ?? null,
    uptimeSec: bundle.uptimeSec,
    lastSeenLabel: online ? "在线" : ago(bundle.latest.time, bundle.observedAt),
    os: bundle.client.os,
    arch: bundle.client.arch,
    kernel: bundle.client.kernel_version,
    cpuName: bundle.client.cpu_name,
    cores: bundle.client.cpu_cores,
    memTotal: bundle.client.mem_total,
    diskTotal: bundle.client.disk_total,
    load1: bundle.latest.load,
    load5: bundle.latest.load5,
    load15: bundle.latest.load15,
    process: bundle.latest.process,
    connections: bundle.latest.connections,
    connectionsUdp: bundle.latest.connections_udp,
    ipv4: bundle.client.ipv4,
    ipv6: bundle.client.ipv6,
    virt: bundle.client.virtualization,
    temp: bundle.latest.temp,
    history,
  };
}

export function adaptFleet(bundles: KomariBundle[]): ProbeNode[] {
  return bundles.map(adaptBundle);
}

export function uptimeCaption(seconds: number, online: boolean, lastSeen: string): string {
  if (!online) return `${lastSeen}离线`;
  return formatUptimeShort(seconds);
}
