import { Link } from "../nav";
import { formatPct, formatPing, formatRate } from "../lib/probe/format";
import { uptimeCaption } from "../lib/probe/adapter";
import type { ProbeNode, RegionId } from "../lib/probe/types";
import { cn } from "../lib/cn";
import { Meter, MiniMeter, Stamp, StatusLabel, healthRail, healthText, meterTone } from "./atoms";

const REGION_ORDER: RegionId[] = ["hk", "tyo", "sin", "lax", "fra"];

export interface NodeGroup {
  id: string;
  label: string;
  country: string;
  nodes: ProbeNode[];
}

export function groupNodes(nodes: ProbeNode[], grouped: boolean): NodeGroup[] {
  if (!grouped) return [{ id: "flat", label: "", country: "", nodes }];
  const buckets = new Map<RegionId, ProbeNode[]>();
  for (const node of nodes) {
    const list = buckets.get(node.region) ?? [];
    list.push(node);
    buckets.set(node.region, list);
  }
  return REGION_ORDER.filter((id) => buckets.has(id)).map((id) => {
    const list = buckets.get(id) ?? [];
    return {
      id,
      label: list[0]?.regionLabel ?? id,
      country: list[0]?.country ?? "",
      nodes: list,
    };
  });
}

function issueLine(node: ProbeNode) {
  return (
    <p className="truncate text-xs text-muted">
      {node.regionLabel} · {node.provider}
      {node.online && node.issue ? (
        <span className={healthText(node.health)}> · {node.issue}</span>
      ) : null}
      {!node.online ? <span> · {node.lastSeenLabel}离线</span> : null}
    </p>
  );
}

function PctCell({ value, online }: { value: number; online: boolean }) {
  if (!online) return <span className="block text-right font-mono text-sm text-faint">—</span>;
  const hot = value >= 90 ? "text-alert" : value >= 75 ? "text-warn" : "text-ink";
  return (
    <div>
      <div className={cn("text-right font-mono text-sm tabular-nums", hot)}>{formatPct(value)}</div>
      <div className="mt-1 h-0.5 rounded-full bg-line">
        <div className={cn("h-full rounded-full", meterTone(value))} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function RateCell({ value, online, hot = false }: { value: number; online: boolean; hot?: boolean }) {
  return (
    <span className={cn("block text-right font-mono text-xs tabular-nums", online ? (hot ? "text-alert" : "text-ink") : "text-faint")}>
      {online ? formatRate(value) : "—"}
    </span>
  );
}

export function NodeList({
  groups,
  view,
  onRegion,
}: {
  groups: NodeGroup[];
  view: "ledger" | "cards";
  onRegion: (region: RegionId) => void;
}) {
  if (view === "cards") {
    return (
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.id}>
            {group.label ? <GroupHead group={group} onRegion={onRegion} /> : null}
            <div className="grid gap-3 md:grid-cols-2">
              {group.nodes.map((node) => (
                <Card key={node.id} node={node} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-sheet shadow-sheet">
      <div className="ledger-grid sticky top-14 z-10 hidden border-b border-line bg-sheet px-4 py-2 text-xs text-muted md:grid">
        <span>节点</span>
        <span className="text-right">CPU</span>
        <span className="text-right">内存</span>
        <span className="wide-col text-right">磁盘</span>
        <span className="text-right">上行</span>
        <span className="text-right">下行</span>
        <span className="text-right">延迟</span>
        <span className="wide-col text-right">在线</span>
        <span className="text-right">状态</span>
      </div>
      {groups.map((group) => (
        <div key={group.id}>
          {group.label ? <GroupHead group={group} onRegion={onRegion} inset /> : null}
          <div className="md:hidden">
            {group.nodes.map((node) => (
              <Brief key={node.id} node={node} />
            ))}
          </div>
          <div className="hidden md:block">
            {group.nodes.map((node) => (
              <LedgerRow key={node.id} node={node} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupHead({
  group,
  onRegion,
  inset = false,
}: {
  group: NodeGroup;
  onRegion: (region: RegionId) => void;
  inset?: boolean;
}) {
  const online = group.nodes.filter((node) => node.online).length;
  return (
    <div className={cn("flex items-center justify-between bg-paper", inset ? "border-b border-line px-4 py-2" : "mb-2")}>
      <button
        type="button"
        className="inline-flex h-11 items-center gap-2 text-sm"
        onClick={() => onRegion(group.id as RegionId)}
      >
        <Stamp code={group.country} />
        <span className="font-medium text-ink">{group.label}</span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {online}/{group.nodes.length}
        </span>
      </button>
    </div>
  );
}

function LedgerRow({ node }: { node: ProbeNode }) {
  const pingHot = (node.ping ?? 0) >= 200;
  return (
    <Link
      to="/nodes/$id"
      params={{ id: node.id }}
      search={{ range: "6h" }}
      className="ledger-grid border-b border-line px-4 py-2.5 transition-colors duration-150 last:border-b-0 hover:bg-hover"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={cn("h-8 w-0.5 shrink-0 rounded-full", healthRail(node.health))} aria-hidden="true" />
        <Stamp code={node.country} />
        <span className="min-w-0">
          <span className={cn("block truncate font-mono text-sm font-medium", node.online ? "text-ink" : "text-faint")}>
            {node.name}
          </span>
          {issueLine(node)}
        </span>
      </span>
      <PctCell value={node.cpu} online={node.online} />
      <PctCell value={node.mem} online={node.online} />
      <span className="wide-col">
        <PctCell value={node.disk} online={node.online} />
      </span>
      <RateCell value={node.netUp} online={node.online} />
      <RateCell value={node.netDown} online={node.online} />
      <span
        className={cn(
          "block text-right font-mono text-xs tabular-nums",
          !node.online || node.ping == null ? "text-faint" : pingHot ? "text-alert" : "text-ink",
        )}
      >
        {node.online ? formatPing(node.ping) : "—"}
      </span>
      <span className="wide-col text-right font-mono text-xs tabular-nums text-muted">
        {node.online ? uptimeCaption(node.uptimeSec, true, node.lastSeenLabel) : "—"}
      </span>
      <span className="flex justify-end">
        <StatusLabel health={node.health} />
      </span>
    </Link>
  );
}

function Brief({ node }: { node: ProbeNode }) {
  return (
    <Link
      to="/nodes/$id"
      params={{ id: node.id }}
      search={{ range: "6h" }}
      className="flex gap-2 border-b border-line px-3 py-2.5 last:border-b-0"
    >
      <span className={cn("w-0.5 shrink-0 rounded-full", healthRail(node.health))} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Stamp code={node.country} />
          <span className={cn("min-w-0 flex-1 truncate font-mono text-sm font-medium", node.online ? "text-ink" : "text-faint")}>
            {node.name}
          </span>
          <StatusLabel health={node.health} />
        </span>
        <span className="mt-1 block">{issueLine(node)}</span>
        <span className="mt-2 grid grid-cols-3 gap-2">
          <MiniMeter label="CPU" value={node.cpu} online={node.online} />
          <MiniMeter label="内存" value={node.mem} online={node.online} />
          <MiniMeter label="磁盘" value={node.disk} online={node.online} />
        </span>
        <span className="mt-2 flex items-center justify-between gap-2 font-mono text-xs tabular-nums text-ink-soft">
          <span>↑ {node.online ? formatRate(node.netUp) : "—"}</span>
          <span>↓ {node.online ? formatRate(node.netDown) : "—"}</span>
          <span className={cn((node.ping ?? 0) >= 200 && node.online ? "text-alert" : undefined)}>
            {node.online ? formatPing(node.ping) : "—"}
          </span>
          <span className="text-faint">{node.online ? uptimeCaption(node.uptimeSec, true, node.lastSeenLabel) : node.lastSeenLabel}</span>
        </span>
      </span>
    </Link>
  );
}

function Card({ node }: { node: ProbeNode }) {
  return (
    <Link
      to="/nodes/$id"
      params={{ id: node.id }}
      search={{ range: "6h" }}
      className="flex flex-col rounded-lg border border-line bg-sheet p-3 shadow-sheet transition-colors duration-150 hover:bg-hover"
    >
      <span className="flex items-start gap-2.5">
        <span className={cn("mt-1 h-8 w-0.5 shrink-0 rounded-full", healthRail(node.health))} aria-hidden="true" />
        <Stamp code={node.country} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className={cn("truncate font-mono text-sm font-medium", node.online ? "text-ink" : "text-faint")}>
              {node.name}
            </span>
            <StatusLabel health={node.health} />
          </span>
          {issueLine(node)}
        </span>
      </span>
      <span className="mt-3 grid gap-2.5">
        <Meter label="CPU" value={node.cpu} online={node.online} />
        <Meter label="内存" value={node.mem} online={node.online} />
        <Meter label="磁盘" value={node.disk} online={node.online} />
      </span>
      <span className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2 font-mono text-xs tabular-nums text-ink-soft">
        <span>↑ {node.online ? formatRate(node.netUp) : "—"}</span>
        <span>↓ {node.online ? formatRate(node.netDown) : "—"}</span>
        <span className={(node.ping ?? 0) >= 200 && node.online ? "text-alert" : undefined}>
          {node.online ? formatPing(node.ping) : "—"}
        </span>
        <span className="text-faint">{node.online ? uptimeCaption(node.uptimeSec, true, node.lastSeenLabel) : node.lastSeenLabel}</span>
      </span>
    </Link>
  );
}

export function NodeSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-sheet" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-line px-4 py-4 last:border-b-0">
          <div className="size-7 animate-pulse rounded-sm bg-hover" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-hover" />
          <div className="ml-auto hidden h-3 w-24 animate-pulse rounded-sm bg-hover sm:block" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-hover" />
        </div>
      ))}
    </div>
  );
}

export function EmptyFleet({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-sheet px-6 py-14 text-center">
      <p className="text-sm text-ink">没有符合条件的节点</p>
      <p className="mt-1 text-sm text-muted">试试更换地区、运营商，或清空搜索。</p>
      <button type="button" onClick={onClear} className="mt-5 h-11 rounded-md bg-ink px-4 text-sm text-paper">
        清除筛选
      </button>
    </div>
  );
}
