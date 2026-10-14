import type { ReactNode } from "react";
import {
  nodeStatus,
  percent,
  type NodeInfo,
  type LiveSnapshot,
} from "@oioprobe/komari-client";
import {
  ArrowDownLeft,
  ArrowUpRight,
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
/** Usage level shared by meters: >80% warns, >=90% is critical. */
export function level(value: number | null) {
  return value == null
    ? ""
    : value >= 90
      ? "critical"
      : value > 80
        ? "high"
        : "";
}
export function Meter({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: number | null;
  icon?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className={`meter ${level(value)}`}>
      <div className="meter-head">
        <span>
          {icon}
          {label}
        </span>
        <b>{value == null ? "—" : `${value.toFixed(1)}%`}</b>
      </div>
      <div className="meter-track" aria-hidden="true">
        <span style={{ width: `${Math.min(100, value ?? 0)}%` }} />
      </div>
      {detail != null ? <small>{detail}</small> : null}
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
            {[node.region || "未知地区", node.group, node.os || "系统未知"]
              .filter(Boolean)
              .map((part, i) => (
                <span key={i}>{part}</span>
              ))}
          </div>
        </div>
        <Status state={state} />
      </div>
      <div className="node-meters">
        <Meter
          icon={<Cpu size={13} />}
          label="CPU"
          value={r?.cpu ?? null}
          detail={`${node.cores} 核`}
        />
        <Meter
          icon={<MemoryStick size={13} />}
          label="内存"
          value={percent(r?.memory, node.memoryTotal)}
          detail={
            <>
              <span>{bytes(r?.memory)}</span> /{" "}
              <span>{bytes(node.memoryTotal)}</span>
            </>
          }
        />
        <Meter
          icon={<HardDrive size={13} />}
          label="磁盘"
          value={percent(r?.disk, node.diskTotal)}
          detail={
            <>
              <span>{bytes(r?.disk)}</span> /{" "}
              <span>{bytes(node.diskTotal)}</span>
            </>
          }
        />
      </div>
      <div className="node-traffic">
        <div className="traffic-down">
          <span>
            <ArrowDownLeft size={13} />
            下载
          </span>
          <b>{bytes(r?.down, true)}</b>
          <small>累计 {bytes(r?.totalDown)}</small>
        </div>
        <div className="traffic-up">
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
          <Clock3 size={13} />
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
