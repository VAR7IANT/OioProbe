import {
  nodeStatus,
  percent,
  type NodeInfo,
  type LiveSnapshot,
} from "@oioprobe/komari-client";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Cpu,
  MemoryStick,
  HardDrive,
} from "lucide-react";
import { RegionFlag } from "./RegionFlag";
export function bytes(value: number | null | undefined, rate = false) {
  if (value == null) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let v = value,
    i = 0;
  while (v >= 1024 && i < 4) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}${rate ? "/s" : ""}`;
}
export const labels = {
  online: "在线",
  offline: "离线",
  stale: "数据过期",
  unknown: "等待数据",
};
export function Status({ state }: { state: keyof typeof labels }) {
  return (
    <span className={`status ${state}`}>
      <i />
      {labels[state]}
    </span>
  );
}
export function Meter({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <b>{value == null ? "—" : `${value.toFixed(1)}%`}</b>
      </div>
      <div className="meter-track">
        <span
          style={{ width: `${value ?? 0}%` }}
          className={value != null && value > 80 ? "high" : ""}
        />
      </div>
    </div>
  );
}
export function NodeCard({
  node,
  live,
  clock,
}: {
  node: NodeInfo;
  live: LiveSnapshot | null;
  clock: number;
}) {
  const state = nodeStatus(node.uuid, live, clock),
    r = state === "online" ? live?.reports[node.uuid] : null;
  return (
    <a
      className={`node-card node-${state}`}
      href={`#/nodes/${encodeURIComponent(node.uuid)}`}
      aria-label={`查看 ${node.name}`}
    >
      <div className="node-card-top">
        <span className="node-emblem" aria-hidden="true">
          <RegionFlag code={node.region} />
        </span>
        <div className="node-identity">
          <h3>{node.name}</h3>
          <div className="node-sub">
            <span>{node.region || "未知地区"}</span>
            <span>·</span>
            <span>{node.group}</span>
          </div>
        </div>
        <Status state={state} />
      </div>
      <div className="node-platform">
        <span>{node.os || "系统未知"}</span>
        <ChevronRight size={14} />
      </div>
      <div className="node-meters">
        <div className="resource-row">
          <Cpu size={13} />
          <Meter label="CPU" value={r?.cpu ?? null} />
          <small>{node.cores} 核</small>
        </div>
        <div className="resource-row">
          <MemoryStick size={13} />
          <Meter label="内存" value={percent(r?.memory, node.memoryTotal)} />
          <small>
            {bytes(r?.memory)} / {bytes(node.memoryTotal)}
          </small>
        </div>
        <div className="resource-row">
          <HardDrive size={13} />
          <Meter label="磁盘" value={percent(r?.disk, node.diskTotal)} />
          <small>
            {bytes(r?.disk)} / {bytes(node.diskTotal)}
          </small>
        </div>
      </div>
      <div className="node-traffic">
        <div>
          <span>
            <ArrowDownLeft size={13} />
            下载
          </span>
          <b>{bytes(r?.down, true)}</b>
          <small>累计 {bytes(r?.totalDown)}</small>
        </div>
        <div>
          <span>
            <ArrowUpRight size={13} />
            上传
          </span>
          <b>{bytes(r?.up, true)}</b>
          <small>累计 {bytes(r?.totalUp)}</small>
        </div>
      </div>
      <div className="node-bottom">
        <span>
          <Clock3 size={12} />
          {r?.uptime == null
            ? "运行时间 —"
            : `已运行 ${Math.floor(r.uptime / 86400)} 天`}
        </span>
        <span className="node-tags">
          {node.tags.slice(0, 2).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </span>
      </div>
    </a>
  );
}
