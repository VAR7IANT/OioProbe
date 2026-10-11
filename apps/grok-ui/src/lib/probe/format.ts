export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatRate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec)) return "—";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let value = bytesPerSec;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = index === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = index === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[index]}`;
}

export function formatGiB(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  return `${gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)} GB`;
}

/** Compact duration for the fleet ledger. */
export function formatUptimeShort(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days >= 1) return `${days}天`;
  if (hours >= 1) return `${hours}小时`;
  return `${minutes}分`;
}

/** Precise duration for the detail instrument. */
export function formatUptimeLong(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${minutes}分`;
  return `${minutes}分`;
}

export function formatPing(ms: number | null): string {
  if (ms == null) return "—";
  return `${Math.round(ms)} ms`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
