import { Link, useNavigate } from "../nav";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "../lib/cn";
import { FLEET_DEFAULTS, type FleetSearch } from "../lib/probe/filters";
import { formatBytes, formatGiB, formatPct, formatPing, formatRate, formatUptimeLong } from "../lib/probe/format";
import { BASE_NODES } from "../lib/probe/mock";
import { projectFleet } from "../lib/probe/project";
import { useProbe } from "../lib/probe/store";
import type { ProbeNode, RangeKey } from "../lib/probe/types";
import { Meter, Stamp, StatusLabel } from "./atoms";
import { PingChart, TrafficChart, UsageChart, seriesSummary } from "./charts";
import { DemoStrip, ProbeLive, SiteFooter, TopBar } from "./chrome";

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "1h", label: "1 小时" },
  { id: "6h", label: "6 小时" },
  { id: "24h", label: "24 小时" },
  { id: "7d", label: "7 天" },
];

export function DetailPage({ id, range }: { id: string; range: RangeKey }) {
  return (
    <ProbeLive>
      <Detail id={id} range={range} />
    </ProbeLive>
  );
}

function Detail({ id, range }: { id: string; range: RangeKey }) {
  const navigate = useNavigate();
  const step = useProbe((state) => state.step);
  const booted = useProbe((state) => state.booted);
  const fleetSearch = useProbe((state) => state.fleetSearch);
  const nodes = useMemo(() => projectFleet(BASE_NODES, step), [step]);
  const node = nodes.find((item) => item.id === id);

  useEffect(() => {
    document.title = node ? `OioProbe · ${node.name}` : "OioProbe · 未找到节点";
  }, [node]);

  if (!node) {
    return (
      <div className="min-h-screen">
        <TopBar booted={booted} />
        <DemoStrip />
        <main className="mx-auto max-w-3xl px-4 py-16 md:px-6">
          <BackLink search={fleetSearch} />
          <h1 className="mt-6 font-mono text-xl text-ink">未找到节点</h1>
          <p className="mt-2 text-sm text-muted">这个标识不在演示数据集中。</p>
        </main>
      </div>
    );
  }

  const history = node.history[range];
  const cpu = seriesSummary(history, "cpu");
  const mem = seriesSummary(history, "mem");
  const up = seriesSummary(history, "up");
  const down = seriesSummary(history, "down");
  const ping = seriesSummary(history, "ping");

  return (
    <div className="min-h-screen">
      <TopBar booted={booted} />
      <DemoStrip />
      <main className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <BackLink search={fleetSearch} />
        <header className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs text-muted">
              <Stamp code={node.country} />
              <span>
                {node.regionLabel} · {node.provider}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-medium tracking-tight text-ink">{node.name}</h1>
              <StatusLabel health={node.health} />
            </div>
            {node.remark ? <p className="mt-2 text-sm text-muted">{node.remark}</p> : null}
          </div>
          <div className="flex h-11 items-center gap-1 overflow-x-auto" role="tablist" aria-label="时间范围">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={range === item.id}
                onClick={() => void navigate({ search: { range: item.id }, replace: true })}
                className={cn("h-11 shrink-0 px-2 text-sm text-muted", range === item.id && "tab-on")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-4 flex flex-col gap-3">
          {!node.online ? (
            <p className="rounded-md border border-line bg-hover px-4 py-3 text-sm text-ink-soft">
              节点离线 · {node.lastSeenLabel}。以下是断线前的演示快照，数值不会继续更新。
            </p>
          ) : null}
          {node.online && node.issue ? (
            <p
              className={cn(
                "rounded-md border px-4 py-3 text-sm",
                node.health === "critical"
                  ? "border-alert bg-alert-soft text-alert"
                  : "border-warn bg-warn-soft text-warn",
              )}
            >
              {node.issue}
            </p>
          ) : null}

          <section className="grid divide-y divide-line rounded-lg border border-line bg-sheet md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-4">
              <Meter
                label="CPU"
                value={node.cpu}
                online={node.online}
                hint={node.online ? `${node.cores} 核 · ${node.cpuName}` : "断线前"}
              />
            </div>
            <div className="p-4">
              <Meter
                label="内存"
                value={node.mem}
                online={node.online}
                hint={node.online ? `${formatBytes((node.memTotal * node.mem) / 100)} / ${formatGiB(node.memTotal)}` : "断线前"}
              />
            </div>
            <div className="p-4">
              <Meter
                label="磁盘"
                value={node.disk}
                online={node.online}
                hint={node.online ? `${formatBytes((node.diskTotal * node.disk) / 100)} / ${formatGiB(node.diskTotal)}` : "断线前"}
              />
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-3">
            <section className="min-w-0 rounded-lg border border-line bg-sheet p-4 lg:col-span-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-ink">处理器与内存</h2>
                <p className="font-mono text-xs tabular-nums text-muted">
                  CPU 均值 {cpu.avg.toFixed(1)}% · 峰值 {cpu.peak.toFixed(1)}%
                  <span className="mx-2 text-line-strong">/</span>
                  内存均值 {mem.avg.toFixed(1)}%
                </p>
              </div>
              <p className="mt-1 text-xs text-faint">实线为 CPU，虚线为内存，红色虚线为 90%。</p>
              <div className="mt-2">
                <UsageChart data={history} />
              </div>
            </section>
            <Facts node={node} booted={booted} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-lg border border-line bg-sheet p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-ink">网络吞吐</h2>
                <p className="font-mono text-xs tabular-nums text-muted">
                  上行峰值 {up.peak.toFixed(2)} · 下行峰值 {down.peak.toFixed(2)} MB/s
                </p>
              </div>
              <p className="mt-1 text-xs text-faint">潮色为上行，墨色为下行。当前 {node.online ? `${formatRate(node.netUp)} ↑  ${formatRate(node.netDown)} ↓` : "无实时流量"}。</p>
              <div className="mt-2">
                <TrafficChart data={history} />
              </div>
            </section>
            <section className="rounded-lg border border-line bg-sheet p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-ink">延迟与丢包</h2>
                {node.pingTarget ? (
                  <p className="font-mono text-xs tabular-nums text-muted">
                    均值 {Math.round(ping.avg)} ms · 峰值 {Math.round(ping.peak)} ms
                  </p>
                ) : null}
              </div>
              {node.pingTarget ? (
                <>
                  <p className="mt-1 text-xs text-faint">
                    探测目标 {node.pingTarget}
                    {node.loss != null ? ` · 最近丢包 ${node.loss.toFixed(1)}%` : ""}
                    {node.ping != null ? ` · 最近 ${formatPing(node.ping)}` : ""}
                  </p>
                  <div className="mt-2">
                    <PingChart data={history} />
                  </div>
                </>
              ) : (
                <p className="mt-8 mb-6 text-sm text-muted">此节点没有配置延迟探测，因此不显示延迟和丢包。</p>
              )}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Facts({ node, booted, className }: { node: ProbeNode; booted: boolean; className?: string }) {
  const rows: { label: string; value: string; mono?: boolean; tone?: string }[] = [
    { label: "系统", value: node.os },
    { label: "架构", value: node.arch, mono: true },
    { label: "内核", value: node.kernel, mono: true },
    { label: "虚拟化", value: node.virt },
    { label: "IPv4", value: node.ipv4, mono: true },
  ];
  if (node.ipv6) rows.push({ label: "IPv6", value: node.ipv6, mono: true });
  rows.push(
    {
      label: node.online ? "在线时长" : "最后在线",
      value: node.online ? formatUptimeLong(node.uptimeSec) : node.lastSeenLabel,
      mono: true,
    },
    {
      label: "负载",
      value: `${node.load1.toFixed(2)} / ${node.load5.toFixed(2)} / ${node.load15.toFixed(2)}`,
      mono: true,
    },
    { label: "进程", value: String(node.process), mono: true },
    {
      label: "连接",
      value: `${node.connections} TCP · ${node.connectionsUdp} UDP`,
      mono: true,
    },
    {
      label: "累计流量",
      value: `↑ ${formatBytes(node.netTotalUp)}  ↓ ${formatBytes(node.netTotalDown)}`,
      mono: true,
    },
  );
  if (node.temp != null) {
    rows.push({
      label: "温度",
      value: `${node.temp.toFixed(0)} °C`,
      mono: true,
      tone: node.temp >= 75 ? "text-alert" : node.temp >= 65 ? "text-warn" : undefined,
    });
  }
  rows.push({
    label: "数据时间",
    value: booted ? "演示源 · 本地时钟在走" : "演示快照 08:00 CST",
  });

  return (
    <section className={cn("rounded-lg border border-line bg-sheet p-4", className)}>
      <h2 className="text-sm font-medium text-ink">节点资料</h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-muted">{row.label}</dt>
            <dd className={cn("min-w-0 text-right text-ink", row.mono && "font-mono text-xs tabular-nums leading-5", row.tone)}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-faint">地址为文档网段。当前负载对应 CPU {formatPct(node.cpu)}。</p>
    </section>
  );
}

function BackLink({ search }: { search: FleetSearch | null }) {
  return (
    <Link
      to="/"
      search={search ?? FLEET_DEFAULTS}
      className={cn("inline-flex h-11 items-center gap-1 text-sm text-ink-soft")}
    >
      <ArrowLeft className="size-4" />
      返回总览
    </Link>
  );
}
