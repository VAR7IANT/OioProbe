import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { HistoryPoint } from "../lib/probe/types";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const tick = {
  fill: "var(--color-faint)",
  fontSize: 12,
  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
};

function axisProps(data: HistoryPoint[]) {
  return {
    dataKey: "label" as const,
    tick,
    axisLine: false,
    tickLine: false,
    minTickGap: 28,
    interval: data.length > 24 ? Math.ceil(data.length / 6) : 0,
  };
}

function Tip({
  active,
  payload,
  label,
  format,
}: TooltipProps<number, string> & { format?: (key: string, value: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-sheet px-3 py-2 shadow-sheet">
      <p className="font-mono text-xs text-faint">{label}</p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="mt-1 flex items-baseline justify-between gap-6 font-mono text-xs">
          <span className="text-muted">{item.name}</span>
          <span className="tabular-nums text-ink">
            {format ? format(String(item.dataKey), Number(item.value)) : item.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Frame({
  children,
  mounted,
  summary,
}: {
  children: ReactNode;
  mounted: boolean;
  summary: string;
}) {
  return (
    <div className="h-52 lg:h-60">
      <p className="sr-only">{summary}</p>
      {mounted ? (
        children
      ) : (
        <div className="flex h-full items-end">
          <div className="h-px w-full bg-line" />
        </div>
      )}
    </div>
  );
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function seriesSummary(data: HistoryPoint[], key: "cpu" | "mem" | "up" | "down" | "ping") {
  const values = data.map((point) => point[key]).filter((value): value is number => value != null);
  return { avg: average(values), peak: values.length ? Math.max(...values) : 0 };
}

export function UsageChart({ data }: { data: HistoryPoint[] }) {
  const mounted = useMounted();
  const cpu = seriesSummary(data, "cpu");
  return (
    <Frame mounted={mounted} summary={`CPU 均值 ${cpu.avg.toFixed(1)}%，峰值 ${cpu.peak.toFixed(1)}%`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis {...axisProps(data)} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            width={36}
            tick={tick}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={90} stroke="var(--color-alert)" strokeDasharray="3 4" strokeOpacity={0.8} />
          <Tooltip
            content={<Tip format={(_key, value) => `${value.toFixed(1)}%`} />}
            cursor={{ stroke: "var(--color-line-strong)" }}
          />
          <Line
            type="monotone"
            dataKey="mem"
            name="内存"
            stroke="var(--color-ink-soft)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="cpu"
            name="CPU"
            stroke="var(--color-tide)"
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function TrafficChart({ data }: { data: HistoryPoint[] }) {
  const mounted = useMounted();
  const down = seriesSummary(data, "down");
  return (
    <Frame mounted={mounted} summary={`下行均值 ${down.avg.toFixed(2)} MB/s，峰值 ${down.peak.toFixed(2)} MB/s`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis {...axisProps(data)} />
          <YAxis
            width={40}
            tick={tick}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
            tickFormatter={(value: number) => (value >= 10 ? value.toFixed(0) : value.toFixed(1))}
          />
          <Tooltip
            content={<Tip format={(_key, value) => `${value.toFixed(2)} MB/s`} />}
            cursor={{ stroke: "var(--color-line-strong)" }}
          />
          <Area
            type="monotone"
            dataKey="down"
            name="下行"
            stroke="var(--color-ink-soft)"
            fill="var(--color-ink-soft)"
            fillOpacity={0.08}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="up"
            name="上行"
            stroke="var(--color-tide)"
            fill="var(--color-tide)"
            fillOpacity={0.14}
            strokeWidth={1.75}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function PingChart({ data }: { data: HistoryPoint[] }) {
  const mounted = useMounted();
  const ping = seriesSummary(data, "ping");
  const lossPeak = Math.max(0, ...data.map((point) => point.loss ?? 0));
  const showLoss = lossPeak > 0;
  return (
    <Frame mounted={mounted} summary={`延迟均值 ${ping.avg.toFixed(0)} 毫秒，峰值 ${ping.peak.toFixed(0)} 毫秒`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: showLoss ? 8 : 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis {...axisProps(data)} />
          <YAxis
            yAxisId="ping"
            width={40}
            tick={tick}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
          />
          {showLoss ? (
            <YAxis
              yAxisId="loss"
              orientation="right"
              width={32}
              tick={tick}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.max(5, Math.ceil(lossPeak))]}
              tickFormatter={(value: number) => `${value}%`}
            />
          ) : null}
          <Tooltip
            content={
              <Tip
                format={(key, value) => (key === "loss" ? `${value.toFixed(1)}%` : `${Math.round(value)} ms`)}
              />
            }
            cursor={{ stroke: "var(--color-line-strong)" }}
          />
          {showLoss ? (
            <Area
              yAxisId="loss"
              type="step"
              dataKey="loss"
              name="丢包"
              stroke="var(--color-warn)"
              fill="var(--color-warn)"
              fillOpacity={0.16}
              strokeWidth={1}
              isAnimationActive={false}
            />
          ) : null}
          <Line
            yAxisId="ping"
            type="monotone"
            dataKey="ping"
            name="延迟"
            stroke="var(--color-tide)"
            strokeWidth={1.75}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Frame>
  );
}
