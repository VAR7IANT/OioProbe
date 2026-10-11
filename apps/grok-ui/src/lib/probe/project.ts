import { clamp, round1 } from "./format";
import { classify, describeIssue } from "./health";
import type { ProbeNode } from "./types";

function phaseOf(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 33 + id.charCodeAt(index)) >>> 0;
  }
  return (hash % 628) / 100;
}

function projectNode(node: ProbeNode, step: number): ProbeNode {
  if (!node.online) return node;
  const phase = phaseOf(node.id);
  const sway = Math.sin(step * 0.7 + phase);
  const swayB = Math.cos(step * 0.45 + phase * 1.3);
  const cpu = round1(clamp(node.cpu + sway * 1.6, 0.4, 99));
  const mem = round1(clamp(node.mem + swayB * 0.8, 0.4, 99));
  const netUp = Math.max(0, Math.round(node.netUp * (1 + sway * 0.06)));
  const netDown = Math.max(0, Math.round(node.netDown * (1 + swayB * 0.06)));
  const ping = node.ping == null ? null : Math.max(1, Math.round(node.ping + sway * 1.4));
  const hour = node.history["1h"].map((point, index, points) => {
    if (index !== points.length - 1) return point;
    return {
      ...point,
      cpu,
      mem,
      up: Math.round((netUp / 1024 / 1024) * 1000) / 1000,
      down: Math.round((netDown / 1024 / 1024) * 1000) / 1000,
      ping,
    };
  });
  const next: ProbeNode = {
    ...node,
    cpu,
    mem,
    netUp,
    netDown,
    ping,
    history: { ...node.history, "1h": hour },
  };
  next.health = classify(next);
  next.issue = describeIssue(next);
  return next;
}

/** Re-projects from the pristine demo snapshot. Step 0 is identity. */
export function projectFleet(nodes: ProbeNode[], step: number): ProbeNode[] {
  if (step === 0) return nodes;
  return nodes.map((node) => projectNode(node, step));
}
