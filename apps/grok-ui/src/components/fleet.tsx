import { Link, useNavigate } from "../nav";
import { LayoutGrid, RefreshCw, Rows3, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/cn";
import { FLEET_DEFAULTS, type FleetSearch, type RegionFilter } from "../lib/probe/filters";
import { formatRate } from "../lib/probe/format";
import { BASE_NODES } from "../lib/probe/mock";
import { projectFleet } from "../lib/probe/project";
import { useProbe } from "../lib/probe/store";
import type { ProbeNode, RegionId } from "../lib/probe/types";
import { DemoStrip, ProbeLive, SiteFooter, TopBar } from "./chrome";
import { EmptyFleet, NodeList, NodeSkeleton, groupNodes } from "./nodes";

const REGIONS: { id: RegionFilter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "hk", label: "香港" },
  { id: "tyo", label: "东京" },
  { id: "sin", label: "新加坡" },
  { id: "lax", label: "洛杉矶" },
  { id: "fra", label: "法兰克福" },
];

const STATUSES: { id: FleetSearch["status"]; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "online", label: "在线" },
  { id: "offline", label: "离线" },
  { id: "issue", label: "异常" },
];

const SORTS: { id: FleetSearch["sort"]; label: string }[] = [
  { id: "region", label: "按地区" },
  { id: "cpu", label: "按 CPU" },
  { id: "ping", label: "按延迟" },
  { id: "traffic", label: "按流量" },
];

function matches(node: ProbeNode, search: FleetSearch, ignore?: "region" | "status") {
  if (ignore !== "region" && search.region !== "all" && node.region !== search.region) return false;
  if (search.provider !== "all" && node.provider !== search.provider) return false;
  if (ignore !== "status") {
    if (search.status === "online" && !node.online) return false;
    if (search.status === "offline" && node.online) return false;
    if (search.status === "issue" && node.health !== "watch" && node.health !== "critical") return false;
  }
  const query = search.q.trim().toLowerCase();
  if (!query) return true;
  const hay = `${node.name} ${node.provider} ${node.regionLabel} ${node.country} ${node.os} ${node.ipv4}`.toLowerCase();
  return hay.includes(query);
}

function rank(node: ProbeNode): number {
  if (node.health === "critical") return 3;
  if (node.health === "watch") return 2;
  if (node.health === "offline") return 1;
  return 0;
}

function orderNodes(nodes: ProbeNode[], sort: FleetSearch["sort"]): ProbeNode[] {
  const list = [...nodes];
  const offlineLast = (a: ProbeNode, b: ProbeNode) => Number(b.online) - Number(a.online);
  if (sort === "cpu") {
    list.sort((a, b) => offlineLast(a, b) || b.cpu - a.cpu || a.name.localeCompare(b.name));
  } else if (sort === "ping") {
    list.sort((a, b) => offlineLast(a, b) || (a.ping ?? 1e9) - (b.ping ?? 1e9) || a.name.localeCompare(b.name));
  } else if (sort === "traffic") {
    list.sort((a, b) => offlineLast(a, b) || b.netUp + b.netDown - (a.netUp + a.netDown) || a.name.localeCompare(b.name));
  } else {
    const order: RegionId[] = ["hk", "tyo", "sin", "lax", "fra"];
    list.sort(
      (a, b) =>
        order.indexOf(a.region) - order.indexOf(b.region) || offlineLast(a, b) || a.name.localeCompare(b.name),
    );
  }
  return list;
}

export function HomePage({ search }: { search: FleetSearch }) {
  return (
    <ProbeLive>
      <Fleet search={search} />
    </ProbeLive>
  );
}

function Fleet({ search }: { search: FleetSearch }) {
  const navigate = useNavigate();
  const step = useProbe((state) => state.step);
  const phase = useProbe((state) => state.phase);
  const booted = useProbe((state) => state.booted);
  const sync = useProbe((state) => state.sync);
  const setFleetSearch = useProbe((state) => state.setFleetSearch);
  const nodes = useMemo(() => projectFleet(BASE_NODES, step), [step]);

  useEffect(() => {
    setFleetSearch(search);
  }, [search, setFleetSearch]);

  const [draft, setDraft] = useState(search.q);
  useEffect(() => {
    setDraft(search.q);
  }, [search.q]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft !== search.q) {
        void navigate({ search: (prev) => ({ ...prev, q: draft }), replace: true });
      }
    }, 160);
    return () => window.clearTimeout(handle);
  }, [draft, navigate, search.q]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      event.preventDefault();
      document.getElementById("node-search")?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const patch = (partial: Partial<FleetSearch>) => {
    void navigate({ search: (prev) => ({ ...prev, ...partial }), replace: true });
  };

  const clear = () => {
    setDraft("");
    void navigate({ search: FLEET_DEFAULTS, replace: true });
  };

  const providers = useMemo(
    () => [...new Set(nodes.map((node) => node.provider))].sort((a, b) => a.localeCompare(b, "en")),
    [nodes],
  );

  const visible = orderNodes(
    nodes.filter((node) => matches(node, search)),
    search.sort,
  );
  const summary = useMemo(() => {
    const online = nodes.filter((node) => node.online);
    const watch = nodes.filter((node) => node.health === "watch").length;
    const critical = nodes.filter((node) => node.health === "critical").length;
    const offline = nodes.filter((node) => !node.online).length;
    const healthy = nodes.length - watch - critical - offline;
    const worst = [...nodes].sort((a, b) => rank(b) - rank(a) || b.cpu - a.cpu)[0];
    return {
      total: nodes.length,
      online: online.length,
      healthy,
      watch,
      critical,
      offline,
      up: online.reduce((sum, node) => sum + node.netUp, 0),
      down: online.reduce((sum, node) => sum + node.netDown, 0),
      worst,
    };
  }, [nodes]);

  const regionFacets = REGIONS.map((region) => {
    const list = nodes.filter((node) => {
      if (region.id !== "all" && node.region !== region.id) return false;
      return matches(node, search, "region");
    });
    const online = list.filter((node) => node.online).length;
    return { ...region, total: list.length, online };
  });

  const statusFacets = STATUSES.map((status) => ({
    ...status,
    count: nodes.filter((node) => matches(node, { ...search, status: status.id })).length,
  }));

  const dirty =
    search.q !== "" ||
    search.region !== "all" ||
    search.provider !== "all" ||
    search.status !== "all" ||
    search.sort !== "region" ||
    search.view !== "ledger";

  const groups = groupNodes(visible, search.sort === "region");

  return (
    <div className="min-h-screen">
      <TopBar booted={booted}>
        <button
          type="button"
          onClick={() => void sync()}
          disabled={phase === "syncing"}
          className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft disabled:opacity-60"
        >
          <RefreshCw className={cn("size-4", phase === "syncing" && "animate-spin")} />
          <span className="hidden sm:inline">{phase === "syncing" ? "同步中" : "同步"}</span>
        </button>
      </TopBar>
      <DemoStrip />
      <main className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <Ribbon summary={summary} />
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <form role="search" className="relative min-w-0 flex-1" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="node-search" className="sr-only">
                搜索节点、线路或服务商
              </label>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <input
                id="node-search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="搜索节点、线路或服务商"
                className="h-11 w-full rounded-md border border-line bg-sheet pr-3 pl-9 text-sm outline-none placeholder:text-faint"
              />
            </form>
            <ViewToggle view={search.view} onChange={(view) => patch({ view })} />
          </div>
          <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:hidden">
            {statusFacets.map((status) => (
              <button
                key={status.id}
                type="button"
                onClick={() => patch({ status: status.id })}
                className={cn(
                  "h-11 shrink-0 rounded-md px-3 text-sm",
                  search.status === status.id ? "bg-ink text-paper" : "text-ink-soft",
                )}
              >
                {status.label}
                <span className="ml-1.5 font-mono text-xs tabular-nums opacity-70">{status.count}</span>
              </button>
            ))}
            <span className="mx-1 w-px shrink-0 self-stretch bg-line" aria-hidden="true" />
            {regionFacets.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => patch({ region: region.id })}
                className={cn(
                  "h-11 shrink-0 rounded-md px-3 text-sm",
                  search.region === region.id ? "bg-ink text-paper" : "text-ink-soft",
                )}
              >
                {region.label}
                <span className="ml-1.5 font-mono text-xs tabular-nums opacity-70">{region.total}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="hidden h-11 grid-cols-4 rounded-md border border-line bg-sheet p-0.5 lg:grid">
              {statusFacets.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  onClick={() => patch({ status: status.id })}
                  className={cn(
                    "h-full rounded-sm text-xs whitespace-nowrap sm:text-sm",
                    search.status === status.id ? "bg-ink text-paper" : "text-ink-soft",
                  )}
                >
                  {status.label}
                  <span className="ml-1 font-mono text-xs tabular-nums opacity-70">{status.count}</span>
                </button>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2">
              <label className="sr-only" htmlFor="provider-filter">
                运营商
              </label>
              <select
                id="provider-filter"
                value={search.provider}
                onChange={(event) => patch({ provider: event.target.value })}
                className="h-11 rounded-md border border-line bg-sheet px-3 text-sm"
              >
                <option value="all">全部运营商</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="sort-order">
                排序
              </label>
              <select
                id="sort-order"
                value={search.sort}
                onChange={(event) => patch({ sort: event.target.value as FleetSearch["sort"] })}
                className="h-11 rounded-md border border-line bg-sheet px-3 text-sm"
              >
                {SORTS.map((sort) => (
                  <option key={sort.id} value={sort.id}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>
            {dirty ? (
              <button type="button" onClick={clear} className="h-11 shrink-0 px-2 text-sm text-tide">
                清除
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-6">
          <nav aria-label="地区" className="sticky top-14 hidden w-24 shrink-0 flex-col lg:flex">
            {regionFacets.map((region) => {
              const active = search.region === region.id;
              return (
                <button
                  key={region.id}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => patch({ region: region.id })}
                  className={cn(
                    "border-l-2 py-2 pr-2 pl-3 text-left",
                    active ? "border-tide" : "border-transparent hover:border-line-strong",
                  )}
                >
                  <span className={cn("block text-sm", active ? "text-ink" : "text-muted")}>{region.label}</span>
                  <span className="font-mono text-xs tabular-nums text-faint">
                    {region.online}/{region.total}
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs text-muted">
              {phase === "syncing" ? (
                "正在同步演示源"
              ) : (
                <>
                  显示 <span className="font-mono tabular-nums text-ink">{visible.length}</span>
                  <span className="text-faint"> / {nodes.length}</span>
                </>
              )}
            </p>
            {phase === "syncing" ? (
              <NodeSkeleton />
            ) : visible.length === 0 ? (
              <EmptyFleet onClear={clear} />
            ) : (
              <NodeList
                groups={groups}
                view={search.view}
                onRegion={(region) => patch({ region })}
              />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Ribbon({
  summary,
}: {
  summary: {
    total: number;
    online: number;
    healthy: number;
    watch: number;
    critical: number;
    offline: number;
    up: number;
    down: number;
    worst: ProbeNode | undefined;
  };
}) {
  const attention = summary.watch + summary.critical;
  const calm = attention === 0 && summary.offline === 0;
  const cells = [
    {
      label: "在线",
      value: `${summary.online} / ${summary.total}`,
      hint: `离线 ${summary.offline}`,
    },
    {
      label: "机群",
      value: calm ? "平稳" : "需留意",
      hint: calm ? "没有异常节点" : `${summary.critical} 严重 · ${summary.watch} 偏高`,
    },
    { label: "入站", value: formatRate(summary.down), hint: "在线节点合计" },
    { label: "出站", value: formatRate(summary.up), hint: "在线节点合计" },
  ];
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-sheet" aria-label="机群摘要">
      <div className="no-scrollbar flex divide-x divide-line overflow-x-auto lg:hidden">
        {cells.map((cell) => (
          <div key={cell.label} className="min-w-32 shrink-0 px-3 py-2">
            <p className="text-xs text-muted">{cell.label}</p>
            <p className="font-mono text-sm tabular-nums whitespace-nowrap text-ink">{cell.value}</p>
          </div>
        ))}
        <div className="min-w-36 shrink-0 px-3 py-2">
          <p className="text-xs text-muted">最先查看</p>
          {summary.worst ? (
            <Link
              to="/nodes/$id"
              params={{ id: summary.worst.id }}
              search={{ range: "6h" }}
              className="block truncate font-mono text-sm text-ink"
            >
              {summary.worst.name}
            </Link>
          ) : (
            <p className="font-mono text-sm text-faint">—</p>
          )}
        </div>
      </div>
      <div className="hidden lg:grid lg:grid-cols-5">
        {cells.map((cell, index) => (
          <div
            key={cell.label}
            className={cn("border-line px-4 py-3", index < cells.length - 1 && "lg:border-r")}
          >
            <p className="text-xs text-muted">{cell.label}</p>
            <p className="mt-0.5 font-mono text-lg tabular-nums text-ink">{cell.value}</p>
            <p className="text-xs text-faint">{cell.hint}</p>
          </div>
        ))}
        <div className="px-4 py-3">
          <p className="text-xs text-muted">最先查看</p>
          {summary.worst ? (
            <Link
              to="/nodes/$id"
              params={{ id: summary.worst.id }}
              search={{ range: "6h" }}
              className="mt-0.5 block truncate font-mono text-lg text-ink"
            >
              {summary.worst.name}
            </Link>
          ) : (
            <p className="mt-0.5 font-mono text-lg text-faint">—</p>
          )}
          <p className="truncate text-xs text-faint">{summary.worst?.issue ?? summary.worst?.regionLabel}</p>
        </div>
      </div>
      <div
        className="flex h-1"
        role="img"
        aria-label={`正常 ${summary.healthy}，偏高 ${summary.watch}，严重 ${summary.critical}，离线 ${summary.offline}`}
      >
        <span className="bg-tide" style={{ width: `${(summary.healthy / summary.total) * 100}%` }} />
        <span className="bg-warn" style={{ width: `${(summary.watch / summary.total) * 100}%` }} />
        <span className="bg-alert" style={{ width: `${(summary.critical / summary.total) * 100}%` }} />
        <span className="bg-line-strong" style={{ width: `${(summary.offline / summary.total) * 100}%` }} />
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 px-3 py-1.5 text-xs text-muted lg:hidden">
        <span>正常 {summary.healthy}</span>
        <span>偏高 {summary.watch}</span>
        <span>严重 {summary.critical}</span>
        <span>离线 {summary.offline}</span>
      </p>
    </section>
  );
}

function ViewToggle({ view, onChange }: { view: FleetSearch["view"]; onChange: (view: FleetSearch["view"]) => void }) {
  return (
    <div className="flex h-11 shrink-0 rounded-md border border-line bg-sheet p-0.5">
      <button
        type="button"
        aria-pressed={view === "ledger"}
        aria-label="列表视图"
        onClick={() => onChange("ledger")}
        className={cn("flex w-11 items-center justify-center rounded-sm", view === "ledger" ? "bg-ink text-paper" : "text-ink-soft")}
      >
        <Rows3 className="size-4" />
      </button>
      <button
        type="button"
        aria-pressed={view === "cards"}
        aria-label="卡片视图"
        onClick={() => onChange("cards")}
        className={cn("flex w-11 items-center justify-center rounded-sm", view === "cards" ? "bg-ink text-paper" : "text-ink-soft")}
      >
        <LayoutGrid className="size-4" />
      </button>
    </div>
  );
}
