import { Link } from "../nav";
import { useEffect, useState, type ReactNode } from "react";
import { FLEET_DEFAULTS } from "../lib/probe/filters";
import { useProbe } from "../lib/probe/store";
import { BrandMark, Wordmark } from "./atoms";

export function ProbeLive({ children }: { children: ReactNode }) {
  const boot = useProbe((state) => state.boot);
  const halt = useProbe((state) => state.halt);
  useEffect(() => {
    boot();
    return () => halt();
  }, [boot, halt]);
  return children;
}

export function Clock({ booted }: { booted: boolean }) {
  const [label, setLabel] = useState("08:00");
  useEffect(() => {
    if (!booted) return;
    const write = () => {
      setLabel(
        new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date()),
      );
    };
    write();
    const id = window.setInterval(write, 1000);
    return () => window.clearInterval(id);
  }, [booted]);

  return (
    <span className="font-mono text-xs tabular-nums text-muted">
      {booted ? `本地 ${label}` : "快照 08:00 CST"}
    </span>
  );
}

export function TopBar({ booted, children }: { booted: boolean; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-t-2 border-b border-t-tide border-b-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 md:px-6">
        <Link to="/" search={FLEET_DEFAULTS} className="flex min-w-0 items-center gap-2" aria-label="OioProbe 总览">
          <BrandMark />
          <span className="min-w-0">
            <Wordmark className="block" />
            <span className="mt-1 hidden text-xs text-muted sm:block">服务器探针</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
          <span className="rounded-sm border border-line bg-sheet px-2 py-1 text-xs text-muted">演示数据</span>
          {children}
          <span className="hidden items-center gap-2 sm:inline-flex">
            {booted ? <span className="live-dot" aria-hidden="true" /> : <span className="inline-block size-1.5 rounded-full bg-faint" />}
            <Clock booted={booted} />
          </span>
        </div>
      </div>
    </header>
  );
}

export function DemoStrip() {
  return (
    <p className="border-b border-line bg-tide-soft px-4 py-2 text-center text-xs text-pretty text-ink-soft md:px-6">
      演示数据。服务器、流量、延迟与丢包均为本地模拟，不是真实监控结果。
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pt-8 pb-12 md:px-6">
      <div className="border-t border-line pt-6">
        <p className="text-sm text-ink">
          <span className="font-serif">Oio</span>
          <span className="font-medium">Probe</span>
          <span className="text-muted"> · 公开状态</span>
        </p>
        <p className="mt-2 max-w-2xl text-sm text-pretty text-muted">
          本页数值由本地模型生成，用于界面演示。地址来自 RFC 5737 与 RFC 3849 文档网段。未连接 Komari
          内核，也不包含任何生产密钥。
        </p>
        <p className="mt-2 font-mono text-xs text-faint">
          /api/nodes · /api/recent/:uuid · /api/records/ping · ws /api/clients
        </p>
      </div>
    </footer>
  );
}
