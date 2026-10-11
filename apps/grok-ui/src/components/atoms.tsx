import type { Health } from "../lib/probe/types";
import { cn } from "../lib/cn";
import { formatPct } from "../lib/probe/format";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 text-ink", className)} aria-hidden="true">
      <circle cx="16" cy="16" r="2.3" className="fill-tide" />
      <path
        d="M16 5.6a10.4 10.4 0 0 1 9 5.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 9.5a6.5 6.5 0 0 1 5.6 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className="text-tide"
      />
      <path
        d="M6.6 21.2A10.4 10.4 0 0 1 16 5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg leading-none tracking-tight whitespace-nowrap text-ink", className)}>
      <span className="font-serif">Oio</span><span className="font-medium">Probe</span>
    </span>
  );
}

export function Stamp({ code }: { code: string }) {
  return (
    <span className="inline-flex h-7 w-8 shrink-0 items-center justify-center rounded-sm border border-line bg-paper font-mono text-xs text-ink-soft">
      {code}
    </span>
  );
}

export function meterTone(value: number): string {
  if (value >= 90) return "bg-alert";
  if (value >= 75) return "bg-warn";
  return "bg-tide";
}

export function healthText(health: Health): string {
  if (health === "critical") return "text-alert";
  if (health === "watch") return "text-warn";
  if (health === "offline") return "text-faint";
  return "text-tide";
}

export function healthDot(health: Health): string {
  if (health === "critical") return "bg-alert";
  if (health === "watch") return "bg-warn";
  if (health === "offline") return "bg-line-strong";
  return "bg-tide";
}

export function healthRail(health: Health): string {
  if (health === "critical") return "bg-alert";
  if (health === "watch") return "bg-warn";
  if (health === "offline") return "bg-line-strong";
  return "bg-transparent";
}

export function statusWord(health: Health): string {
  if (health === "offline") return "离线";
  if (health === "online") return "在线";
  return "异常";
}

export function StatusLabel({ health }: { health: Health }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", healthText(health))}>
      <span className={cn("size-1.5 rounded-full", healthDot(health))} aria-hidden="true" />
      {statusWord(health)}
    </span>
  );
}

export function Meter({
  label,
  value,
  hint,
  online = true,
}: {
  label: string;
  value: number;
  hint?: string;
  online?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted">{label}</span>
        <span className={cn("font-mono text-sm tabular-nums", online ? "text-ink" : "text-faint")}>
          {online ? formatPct(value) : "—"}
        </span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-line">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", online ? meterTone(value) : "bg-transparent")}
          style={{ width: online ? `${Math.min(100, Math.max(0, value))}%` : "0%" }}
        />
      </div>
      {hint ? <p className="mt-1.5 truncate text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

export function MiniMeter({ label, value, online }: { label: string; value: number; online: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xs text-faint">{label}</span>
        <span className="font-mono text-xs tabular-nums text-ink">{online ? formatPct(value) : "—"}</span>
      </div>
      <div className="mt-1 h-1 rounded-full bg-line">
        <div
          className={cn("h-full rounded-full", online ? meterTone(value) : "bg-transparent")}
          style={{ width: online ? `${Math.min(100, value)}%` : "0%" }}
        />
      </div>
    </div>
  );
}
