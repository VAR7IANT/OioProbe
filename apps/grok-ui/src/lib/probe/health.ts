import type { Health } from "./types";

export function classify(input: {
  online: boolean;
  cpu: number;
  mem: number;
  disk: number;
  ping: number | null;
  loss: number | null;
}): Health {
  if (!input.online) return "offline";
  if (
    input.cpu >= 90 ||
    input.mem >= 92 ||
    input.disk >= 92 ||
    (input.loss ?? 0) >= 3 ||
    (input.ping ?? 0) >= 200
  ) {
    return "critical";
  }
  if (
    input.cpu >= 75 ||
    input.mem >= 85 ||
    input.disk >= 85 ||
    (input.loss ?? 0) >= 1 ||
    (input.ping ?? 0) >= 120
  ) {
    return "watch";
  }
  return "online";
}

export function describeIssue(input: {
  online: boolean;
  cpu: number;
  mem: number;
  disk: number;
  ping: number | null;
  loss: number | null;
}): string | null {
  if (!input.online) return null;
  const parts: string[] = [];
  if (input.cpu >= 90) parts.push("CPU 高于 90%");
  else if (input.cpu >= 75) parts.push("CPU 偏高");
  if (input.mem >= 92) parts.push("内存高于 90%");
  else if (input.mem >= 85) parts.push("内存偏高");
  if (input.disk >= 92) parts.push("磁盘高于 90%");
  else if (input.disk >= 85) parts.push("磁盘偏高");
  if (input.loss != null && input.loss >= 3) parts.push("丢包严重");
  else if (input.loss != null && input.loss >= 1) parts.push("存在丢包");
  if (input.ping != null && input.ping >= 200) parts.push("延迟异常");
  else if (input.ping != null && input.ping >= 120) parts.push("延迟偏高");
  return parts.length ? parts.join(" · ") : null;
}
