import type {
  NodeInfo,
  LiveSnapshot,
  HistoryPoint,
} from "@oioprobe/komari-client";
const GiB = 1024 ** 3;
export const demoNodes: NodeInfo[] = [
  ["tokyo", "Tokyo · 01", "JP", "亚太", "AMD EPYC 7B13", 4, 8, 80],
  ["hongkong", "Hong Kong · 01", "HK", "亚太", "Intel Xeon Platinum", 2, 4, 60],
  ["singapore", "Singapore · 01", "SG", "亚太", "AMD EPYC 9354", 4, 8, 100],
  [
    "losangeles",
    "Los Angeles · 01",
    "US",
    "北美",
    "AMD Ryzen 9 7950X",
    4,
    8,
    120,
  ],
  ["toronto", "Toronto · 01", "CA", "北美", "Intel Xeon E5-2690", 2, 4, 50],
  ["frankfurt", "Frankfurt · 01", "DE", "欧洲", "AMD EPYC 7763", 2, 4, 80],
].map(([uuid, name, region, group, cpuName, cores, memory, disk], i) => ({
  uuid: String(uuid),
  name: String(name),
  region: String(region),
  group: String(group),
  cpuName: String(cpuName),
  cores: Number(cores),
  memoryTotal: Number(memory) * GiB,
  diskTotal: Number(disk) * GiB,
  os: "Ubuntu 24.04 LTS",
  tags: i % 2 ? ["KVM"] : ["KVM", "NVMe"],
  weight: 6 - i,
}));
export function demoLive(): LiveSnapshot {
  return {
    online: demoNodes.slice(0, 5).map((n) => n.uuid),
    reports: Object.fromEntries(
      demoNodes.map((n, i) => [
        n.uuid,
        {
          cpu: [18.4, 7.2, 32.8, 12.6, 4.1, 0][i],
          memory: n.memoryTotal * [0.42, 0.26, 0.61, 0.38, 0.19, 0][i],
          disk: n.diskTotal * [0.32, 0.18, 0.44, 0.27, 0.12, 0][i],
          up: [220000, 78000, 950000, 1250000, 32000, 0][i],
          down: [1800000, 680000, 2200000, 3200000, 240000, 0][i],
          totalUp: 125 * GiB,
          totalDown: 322 * GiB,
          uptime: 86400 * (i + 12),
          updatedAt: new Date().toISOString(),
        },
      ]),
    ),
  };
}
export function demoHistory(): HistoryPoint[] {
  return Array.from({ length: 48 }, (_, i) => ({
    time: new Date(Date.now() - (47 - i) * 300000).toISOString(),
    cpu: 18 + Math.sin(i * 0.7) * 7 + Math.cos(i * 0.21) * 4,
    memory: 3 * GiB,
    disk: 20 * GiB,
    up: 200000,
    down: 1800000,
  }));
}
