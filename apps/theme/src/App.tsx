import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  Command,
  ExternalLink,
  Info,
  LayoutDashboard,
  LayoutGrid,
  List,
  LoaderCircle,
  Menu,
  Monitor,
  Moon,
  Network,
  Palette,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldAlert,
  Sun,
  X,
} from "lucide-react";
import {
  nodeStatus,
  percent,
  type NodeInfo,
  type HistoryPoint,
} from "@oioprobe/komari-client";
import { useProbe, client, isDemo, isVercel, adminHref } from "./useProbe";
import { demoHistory } from "./demo";
import { Button } from "./components/ui/button";
import { bytes, Meter, NodeCard, Status } from "./components/Metrics";
import { RegionFlag } from "./components/RegionFlag";
import { World } from "./components/World";
import { THEME_KEY, readTheme, resolveTheme, type ThemePref } from "./theme";
type Probe = ReturnType<typeof useProbe>;
const nav = [
  ["overview", "总览", LayoutDashboard],
  ["nodes", "节点", Server],
  ["network", "网络", Network],
  ["alerts", "告警", Bell],
  ["settings", "设置", Settings2],
] as const;
const subtitles: Record<string, string> = {
  overview: "节点状态、资源占用与实时流量。",
  nodes: "搜索、筛选并比较每个节点的资源占用。",
  network: "延迟、丢包与链路质量分析。",
  alerts: "告警规则、通知渠道与事件记录。",
  settings: "显示偏好与 Komari 原生管理入口。",
  design: "界面实际使用的 tokens 与组件状态。",
};
function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(2) || "overview");
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(2) || "overview");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}
function usePreference<T extends string>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T | null) ?? fallback;
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Browser privacy settings may disallow storage. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readTheme),
    [resolved, setResolved] = useState(() => resolveTheme(readTheme()));
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = resolveTheme(pref);
      setResolved(next);
      // Switch in a single frame: animating colors between themes briefly
      // shows low-contrast mixes of old and new values.
      const root = document.documentElement;
      root.classList.add("theme-switching");
      root.dataset.theme = next;
      void getComputedStyle(document.body).color;
      setTimeout(() => root.classList.remove("theme-switching"), 0);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", next === "dark" ? "#0d0d0d" : "#f6f6f4");
    };
    apply();
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch {
      /* Browser privacy settings may disallow storage. */
    }
    if (pref !== "system" || !media) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [pref]);
  return { pref, setPref, resolved };
}
function connectionLabel(probe: Probe) {
  if (isDemo) return ["demo", "演示模式"] as const;
  if (probe.error) return ["bad", "连接失败"] as const;
  if (probe.connection === "connected") return ["good", "实时连接"] as const;
  if (probe.connection === "reconnecting") return ["warn", "正在重连"] as const;
  return ["warn", "正在连接"] as const;
}
export default function App() {
  const probe = useProbe(),
    route = useRoute(),
    page = route.split("/")[0],
    isDetail = page === "nodes" && route.includes("/");
  const [menu, setMenu] = useState(false),
    theme = useTheme();
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const outside = (e: PointerEvent) =>
      !(e.target as Element).closest?.(".site-header") && setMenu(false);
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  const title =
    nav.find((n) => n[0] === page)?.[1] ??
    (page === "design" ? "设计系统" : "页面未找到");
  const [tone, connection] = connectionLabel(probe);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        跳到主内容
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#/overview" aria-label="OioProbe 首页">
            <span className="brand-mark">
              <Activity size={18} strokeWidth={2.4} />
            </span>
            <span>
              Oio<span className="brand-light">Probe</span>
            </span>
          </a>
          <nav aria-label="主导航" className={`site-nav ${menu ? "open" : ""}`}>
            {nav.map(([key, label, Icon]) => (
              <a
                key={key}
                href={`#/${key}`}
                className={page === key ? "active" : ""}
                aria-current={page === key ? "page" : undefined}
              >
                <Icon size={16} />
                {label}
              </a>
            ))}
          </nav>
          <div className="top-actions">
            <span className={`connection ${tone}`} title={connection}>
              <i />
              <span className="connection-label">{connection}</span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                theme.resolved === "light" ? "切换深色主题" : "切换浅色主题"
              }
              onClick={() =>
                theme.setPref(theme.resolved === "light" ? "dark" : "light")
              }
            >
              {theme.resolved === "light" ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} />
              )}
            </Button>
            <Button variant="outline" asChild className="admin-button">
              <a
                href={adminHref ?? "#/settings"}
                target={isVercel ? "_blank" : undefined}
                rel={isVercel ? "noopener noreferrer" : undefined}
              >
                管理
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label={menu ? "关闭导航" : "打开导航"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={19} /> : <Menu size={19} />}
            </Button>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {isDetail && !probe.error && !probe.loading ? null : (
          <div className="page-heading">
            <div>
              <h1>{page === "overview" ? "服务器总览" : title}</h1>
              <p>{subtitles[page] ?? "资源、连接与变化，一眼掌握。"}</p>
            </div>
            <Button variant="outline" onClick={probe.retry}>
              <RefreshCw size={15} />
              刷新数据
            </Button>
          </div>
        )}
        {isDemo ? (
          <div className="demo-banner">
            <Monitor size={15} />
            <span>设计预览 · 所有节点与指标均为演示数据</span>
          </div>
        ) : null}
        {probe.error ? (
          <div className="error-panel" role="alert">
            <span className="state-icon danger">
              <ShieldAlert size={22} />
            </span>
            <h2>无法读取监控数据</h2>
            <p>{probe.error}</p>
            <div>
              <Button onClick={probe.retry}>重试连接</Button>
              <Button asChild variant="outline">
                <a
                  href={adminHref ?? "#/settings"}
                  target={isVercel ? "_blank" : undefined}
                  rel={isVercel ? "noopener noreferrer" : undefined}
                >
                  前往原生管理登录
                </a>
              </Button>
            </div>
            <small>
              {isVercel
                ? "请检查 VITE_KOMARI_ORIGIN、Cloudflare Tunnel，以及 Komari 的 CORS / WebSocket Origin 允许列表。"
                : "请确认本地 Komari 正在运行，且 /api 代理配置正确。"}
            </small>
          </div>
        ) : probe.loading ? (
          <div className="loading-state" role="status">
            <p>
              <LoaderCircle size={16} className="spin" />
              正在读取节点信息…
            </p>
            <div className="skeleton-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          </div>
        ) : page === "overview" ? (
          <Overview probe={probe} />
        ) : isDetail ? (
          <NodeDetail uuid={decodeRoute(route)} probe={probe} />
        ) : page === "nodes" ? (
          <NodeList probe={probe} />
        ) : page === "network" ? (
          <NetworkPage />
        ) : page === "alerts" ? (
          <Coming icon="alerts" />
        ) : page === "settings" ? (
          <Settings theme={theme.pref} setTheme={theme.setPref} />
        ) : page === "design" ? (
          <Design />
        ) : (
          <div className="empty-panel">
            <h2>页面未找到</h2>
            <p>链接可能已失效，或页面尚未开放。</p>
            <Button asChild>
              <a href="#/overview">返回总览</a>
            </Button>
          </div>
        )}
        <footer>
          <span>
            OioProbe <span className="footer-dot">/</span> Your servers, at a
            glance.
          </span>
          <span>
            Powered by{" "}
            <a
              href="https://github.com/komari-monitor/komari"
              target="_blank"
              rel="noreferrer"
            >
              Komari
            </a>
            <span className="footer-dot">·</span>
            <a href="#/design">设计系统</a>
          </span>
        </footer>
      </main>
    </div>
  );
}
function decodeRoute(route: string) {
  try {
    return decodeURIComponent(route.slice(6));
  } catch {
    return "";
  }
}
function Overview({ probe }: { probe: Probe }) {
  const [region, setRegion] = useState("");
  const { nodes, live, clock } = probe;
  const online = nodes.filter(
    (n) => nodeStatus(n.uuid, live, clock) === "online",
  );
  const offline = nodes.filter(
    (n) => nodeStatus(n.uuid, live, clock) === "offline",
  );
  const stale = nodes.filter(
    (n) => nodeStatus(n.uuid, live, clock) === "stale",
  );
  const reports = online.map((n) => live!.reports[n.uuid]);
  const sum = (key: "down" | "up" | "totalDown" | "totalUp") => {
    const values = reports.map((r) => r[key]);
    return values.length && values.every((v): v is number => v !== null)
      ? values.reduce((a, v) => a + v, 0)
      : null;
  };
  return (
    <>
      <div className="probe-summary">
        <section className="panel node-summary">
          <div className="panel-heading">
            <h2>
              <Server size={16} />
              节点情况
            </h2>
            <span className={`summary-hint ${stale.length ? "warn" : ""}`}>
              {stale.length ? `${stale.length} 个数据过期` : "当前连接状态"}
            </span>
          </div>
          <div className="summary-numbers">
            <div>
              <span>总节点</span>
              <strong>{nodes.length}</strong>
            </div>
            <div className="tone-success">
              <span>
                <i className="dot" />
                在线节点
              </span>
              <strong>{live ? online.length : "—"}</strong>
            </div>
            <div className="tone-danger">
              <span>
                <i className="dot" />
                离线节点
              </span>
              <strong>{live ? offline.length : "—"}</strong>
            </div>
          </div>
          <div className="health-bar" aria-hidden="true">
            {live
              ? (
                  [
                    ["online", online.length],
                    ["stale", stale.length],
                    ["offline", offline.length],
                    [
                      "unknown",
                      nodes.length -
                        online.length -
                        stale.length -
                        offline.length,
                    ],
                  ] as const
                )
                  .filter(([, count]) => count > 0)
                  .map(([state, count]) => (
                    <span
                      key={state}
                      className={state}
                      style={{ "--share": count } as CSSProperties}
                    />
                  ))
              : null}
          </div>
        </section>
        <section className="panel network-summary">
          <div className="panel-heading">
            <h2>
              <Network size={16} />
              网络概况
            </h2>
            <span className="summary-hint">当前在线节点汇总</span>
          </div>
          <div className="network-summary-grid">
            <div className="traffic-down">
              <span>
                <ArrowDownLeft size={15} />
                下载
              </span>
              <strong>{bytes(sum("down"), true)}</strong>
              <small>累计接收 {bytes(sum("totalDown"))}</small>
            </div>
            <div className="traffic-up">
              <span>
                <ArrowUpRight size={15} />
                上传
              </span>
              <strong>{bytes(sum("up"), true)}</strong>
              <small>累计发送 {bytes(sum("totalUp"))}</small>
            </div>
          </div>
        </section>
      </div>
      <World nodes={nodes} selected={region} onSelect={setRegion} />
      <NodeList
        probe={probe}
        compact
        region={region}
        clearRegion={() => setRegion("")}
      />
    </>
  );
}
function NodeList({
  probe,
  compact = false,
  region = "",
  clearRegion,
}: {
  probe: Probe;
  compact?: boolean;
  region?: string;
  clearRegion?: () => void;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("全部分组"),
    [status, setStatus] = useState("all"),
    [view, setView] = usePreference<"grid" | "list">(
      "oioprobe.view.v1",
      "grid",
    ),
    [sort, setSort] = useState("default");
  const stateOf = (n: NodeInfo) => nodeStatus(n.uuid, probe.live, probe.clock);
  // Status counts follow every other active filter so the tabs preview results.
  const base = probe.nodes.filter(
    (n) =>
      (!region || n.region === region) &&
      (group === "全部分组" || n.group === group) &&
      `${n.name} ${n.region} ${n.group} ${n.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const filtered = base
    .filter((n) => status === "all" || stateOf(n) === status)
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "cpu"
          ? currentCpu(b) - currentCpu(a)
          : b.weight - a.weight,
    );
  function currentCpu(n: NodeInfo) {
    return stateOf(n) === "online"
      ? (probe.live?.reports[n.uuid]?.cpu ?? -1)
      : -1;
  }
  return (
    <section className="nodes-section">
      <div className="nodes-heading">
        <div>
          <h2>
            {compact ? "节点总览" : "全部节点"}{" "}
            <span>{probe.nodes.length}</span>
          </h2>
          {region ? (
            <button className="region-clear" onClick={clearRegion}>
              地区：{region} · 清除筛选 <X size={12} />
            </button>
          ) : null}
        </div>
        {compact ? (
          <a className="text-link" href="#/nodes">
            查看全部
            <ArrowUpRight size={14} />
          </a>
        ) : null}
      </div>
      <div className="filters">
        <div className="filter-tabs" role="group" aria-label="节点状态筛选">
          {[
            ["all", "全部节点"],
            ["online", "在线"],
            ["offline", "离线"],
            ["stale", "过期"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={status === value}
              className={status === value ? "selected" : ""}
              onClick={() => setStatus(value)}
            >
              {label}
              <span className="tab-count" aria-hidden="true">
                {value === "all"
                  ? base.length
                  : base.filter((n) => stateOf(n) === value).length}
              </span>
            </button>
          ))}
        </div>
        <div className="filter-right">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="搜索节点"
              placeholder="搜索名称、地区或标签…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button aria-label="清除搜索" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            ) : null}
          </label>
          <select
            aria-label="节点排序"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="default">默认排序</option>
            <option value="name">按名称</option>
            <option value="cpu">CPU 从高到低</option>
          </select>
          <select
            aria-label="节点分组"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option>全部分组</option>
            {[...new Set(probe.nodes.map((n) => n.group))].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
          <div className="view-toggle" role="group" aria-label="视图">
            <button
              aria-label="卡片视图"
              aria-pressed={view !== "list"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              aria-label="列表视图"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
      {filtered.length ? (
        <div className={`node-grid ${view === "list" ? "list-view" : ""}`}>
          {filtered.map((node) => (
            <NodeCard
              key={node.uuid}
              node={node}
              live={probe.live}
              clock={probe.clock}
            />
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <span className="state-icon">
            <Server size={22} />
          </span>
          <h3>{probe.nodes.length ? "没有匹配的节点" : "尚未接入节点"}</h3>
          <p>
            {probe.nodes.length
              ? "试试其他关键词，或重置筛选条件。"
              : "连接首个节点后，资源和在线状态将在这里显示。"}
          </p>
          {probe.nodes.length ? (
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setGroup("全部分组");
                setStatus("all");
                clearRegion?.();
              }}
            >
              重置筛选
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
function NodeDetail({ uuid, probe }: { uuid: string; probe: Probe }) {
  const n = probe.nodes.find((n) => n.uuid === uuid);
  return n ? (
    <Detail node={n} probe={probe} />
  ) : (
    <div className="empty-panel">
      <span className="state-icon">
        <Server size={22} />
      </span>
      <h1>节点不存在或不可访问</h1>
      <p>该节点可能已被移除，或当前站点不公开它。</p>
      <Button asChild variant="outline">
        <a href="#/nodes">返回节点列表</a>
      </Button>
    </div>
  );
}
function Detail({ node: n, probe }: { node: NodeInfo; probe: Probe }) {
  const [hours, setHours] = useState(4),
    [history, setHistory] = useState<HistoryPoint[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (isDemo) {
      setHistory(demoHistory());
      return;
    }
    const controller = new AbortController();
    setHistory([]);
    setError("");
    setLoading(true);
    client
      .history(n.uuid, hours, controller.signal)
      .then(setHistory)
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "读取失败");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [n.uuid, hours]);
  const state = nodeStatus(n.uuid, probe.live, probe.clock),
    r = state === "online" ? probe.live?.reports[n.uuid] : null;
  const points = history.filter((p) => p.cpu != null);
  return (
    <>
      <a className="back-link" href="#/nodes">
        <ArrowLeft size={14} />
        返回节点列表
      </a>
      <div className="detail-heading">
        <span className="node-emblem large" aria-hidden="true">
          <RegionFlag code={n.region} />
        </span>
        <div className="detail-title">
          <h1>{n.name}</h1>
          <p>
            {[n.region || "未知地区", n.group, n.os]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="detail-actions">
          <Status state={state} />
          <Button variant="outline" onClick={probe.retry}>
            <RefreshCw size={15} />
            刷新数据
          </Button>
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>实时资源</h2>
          <div className="detail-meters">
            <Meter
              label="CPU"
              value={r?.cpu ?? null}
              detail={`${n.cores || "—"} 核`}
            />
            <Meter
              label="内存"
              value={percent(r?.memory, n.memoryTotal)}
              detail={`${bytes(r?.memory)} / ${bytes(n.memoryTotal)}`}
            />
            <Meter
              label="磁盘"
              value={percent(r?.disk, n.diskTotal)}
              detail={`${bytes(r?.disk)} / ${bytes(n.diskTotal)}`}
            />
          </div>
          <div className="detail-traffic">
            <div className="traffic-down">
              <span>
                <ArrowDownLeft size={14} />
                下载
              </span>
              <b>{bytes(r?.down, true)}</b>
              <small>累计 {bytes(r?.totalDown)}</small>
            </div>
            <div className="traffic-up">
              <span>
                <ArrowUpRight size={14} />
                上传
              </span>
              <b>{bytes(r?.up, true)}</b>
              <small>累计 {bytes(r?.totalUp)}</small>
            </div>
          </div>
        </section>
        <section className="panel">
          <h2>节点信息</h2>
          <dl>
            <dt>处理器</dt>
            <dd>{n.cpuName || "—"}</dd>
            <dt>CPU 核心</dt>
            <dd>{n.cores || "—"}</dd>
            <dt>内存容量</dt>
            <dd>{bytes(n.memoryTotal)}</dd>
            <dt>磁盘容量</dt>
            <dd>{bytes(n.diskTotal)}</dd>
            <dt>操作系统</dt>
            <dd>{n.os || "—"}</dd>
            <dt>运行时间</dt>
            <dd>
              {r?.uptime == null ? "—" : `${Math.floor(r.uptime / 86400)} 天`}
            </dd>
          </dl>
        </section>
      </div>
      <section className="panel history">
        <div className="panel-heading">
          <div>
            <h2>CPU 历史</h2>
            <p>{isDemo ? "演示曲线" : "原生 Komari 历史记录"} · 百分比</p>
          </div>
          <select
            aria-label="历史时间范围"
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            <option value={1}>近 1 小时</option>
            <option value={4}>近 4 小时</option>
            <option value={24}>近 24 小时</option>
          </select>
        </div>
        {error ? (
          <p className="chart-state" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="chart-state" role="status">
            <LoaderCircle size={16} className="spin" />
            读取历史数据…
          </p>
        ) : points.length ? (
          <CpuChart points={points} />
        ) : (
          <div className="chart-state">暂无历史记录</div>
        )}
      </section>
    </>
  );
}
function CpuChart({ points }: { points: HistoryPoint[] }) {
  // Draw at the real pixel width so axis labels stay legible on phones.
  const box = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(800),
    [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, Math.round(entry.contentRect.width))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const values = points.map((p) => p.cpu ?? 0),
    peak = Math.max(...values),
    avg = values.reduce((a, v) => a + v, 0) / values.length,
    // Scale to the data with round ticks so low, steady load stays readable.
    top = [5, 10, 20, 25].map((step) => step * 4).find((t) => t >= peak) ?? 100,
    [left, right, y0, h] = [40, width - 4, 188, 176],
    x = (i: number) =>
      left + (i * (right - left)) / Math.max(1, points.length - 1),
    y = (v: number) => y0 - (v / top) * h,
    line = values.map((v, i) => `${i ? "L" : "M"} ${x(i)} ${y(v)}`).join(" "),
    area = `${line} L ${x(values.length - 1)} ${y0} L ${left} ${y0} Z`,
    time = (i: number) =>
      new Date(points[i].time).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  return (
    <>
      <div className="chart-stats">
        <div>
          <span>当前</span>
          <b>{values.at(-1)!.toFixed(1)}%</b>
        </div>
        <div>
          <span>平均</span>
          <b>{avg.toFixed(1)}%</b>
        </div>
        <div>
          <span>峰值</span>
          <b>{peak.toFixed(1)}%</b>
        </div>
      </div>
      <div className="chart-box" ref={box}>
        <svg
          className="chart"
          viewBox={`0 0 ${width} 214`}
          height="214"
          role="img"
          aria-label="CPU 历史折线图"
          onPointerMove={(e) => {
            const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const i = Math.round(
              ((px - left) / (right - left)) * (points.length - 1),
            );
            setHover(Math.max(0, Math.min(points.length - 1, i)));
          }}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="cpu-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line
                x1={left}
                y1={y(top * f)}
                x2={right}
                y2={y(top * f)}
                className={`chart-grid ${f ? "" : "base"}`}
              />
              <text x={left - 8} y={y(top * f) + 4} textAnchor="end">
                {Math.round(top * f)}%
              </text>
            </g>
          ))}
          <path d={area} fill="url(#cpu-area)" />
          <path d={line} className="chart-line" />
          {hover != null ? (
            <g className="chart-hover">
              <line x1={x(hover)} x2={x(hover)} y1={y0 - h} y2={y0} />
              <circle cx={x(hover)} cy={y(values[hover])} r="4" />
            </g>
          ) : null}
          {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(
            (i, k) => (
              <text
                key={k}
                x={x(i)}
                y="210"
                textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
              >
                {time(i)}
              </text>
            ),
          )}
        </svg>
        {hover != null ? (
          <div
            className="chart-tooltip"
            style={{
              left: x(hover),
              top: y(values[hover]),
              translate: `${x(hover) < 90 ? "0" : x(hover) > width - 90 ? "-100%" : "-50%"} calc(-100% - 12px)`,
            }}
          >
            <span>{time(hover)}</span>
            <b>
              <i />
              CPU {values[hover].toFixed(1)}%
            </b>
          </div>
        ) : null}
      </div>
    </>
  );
}
function Coming({ icon }: { icon: "alerts" | "network" }) {
  return (
    <div className="coming panel">
      <span className="state-icon">
        {icon === "alerts" ? <Bell size={24} /> : <Network size={24} />}
      </span>
      <span className="subtle-badge">即将接入</span>
      <h2>
        {icon === "alerts"
          ? "让重要变化，及时被看见"
          : "从连通到延迟，看清每一条链路"}
      </h2>
      <p>
        {icon === "alerts"
          ? "告警规则、通知渠道与事件记录将在后续阶段接入。"
          : "Ping 任务、延迟与丢包分析将在后续阶段接入。"}
      </p>
      <div className="planned-grid">
        {(icon === "alerts"
          ? ["资源阈值", "离线通知", "事件时间线"]
          : ["Ping 延迟", "丢包统计", "历史趋势"]
        ).map((v) => (
          <div key={v}>
            <Command size={16} />
            <b>{v}</b>
            <small>页面结构已预留</small>
          </div>
        ))}
      </div>
    </div>
  );
}
function NetworkPage() {
  return (
    <>
      <div className="section-notice">
        <Info size={16} />
        页面骨架已完成，网络数据不在此阶段展示。
      </div>
      <Coming icon="network" />
    </>
  );
}
function Settings({
  theme,
  setTheme,
}: {
  theme: ThemePref;
  setTheme: (v: ThemePref) => void;
}) {
  const options = [
    ["light", "浅色", Sun],
    ["dark", "深色", Moon],
    ["system", "跟随系统", Monitor],
  ] as const;
  return (
    <div className="settings-grid">
      <section className="panel">
        <h2>显示偏好</h2>
        <p className="muted">保存在当前浏览器，仅影响主题显示。</p>
        <div className="theme-options" role="group" aria-label="主题">
          {options.map(([value, label, Icon]) => (
            <button
              key={value}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
            >
              <span className={`theme-preview ${value}`} aria-hidden="true">
                <i />
                <i />
              </span>
              <span className="theme-option-label">
                <Icon size={15} />
                {label}
                {theme === value ? <Check size={15} /> : null}
              </span>
            </button>
          ))}
        </div>
        <div className="settings-row">
          <span>界面语言</span>
          <b>简体中文</b>
        </div>
        <div className="settings-row">
          <span>监控单位</span>
          <b>IEC 字节 / 秒</b>
        </div>
      </section>
      <section className="panel">
        <h2>管理与内核</h2>
        <p className="muted">节点、权限和站点配置由 Komari 原生管理负责。</p>
        <div className="settings-row">
          <span>兼容基线</span>
          <b>Komari 1.5.1</b>
        </div>
        <div className="settings-row">
          <span>当前阶段</span>
          <b>技术基线 + 页面骨架</b>
        </div>
        <Button asChild variant="outline">
          <a
            href={adminHref ?? "#/settings"}
            target="_blank"
            rel="noopener noreferrer"
          >
            打开原生管理
            <ExternalLink size={14} />
          </a>
        </Button>
      </section>
    </div>
  );
}
function Design() {
  return (
    <div className="design-page">
      <section className="panel">
        <span className="state-icon">
          <Palette size={22} />
        </span>
        <h2>OioProbe 设计语言</h2>
        <p className="muted">
          雾白底色，石墨文字，克制蓝。把注意力留给节点状态。
        </p>
        <div className="swatches">
          {[
            ["雾白", "--background"],
            ["白瓷", "--surface"],
            ["石墨", "--text"],
            ["监控蓝", "--accent"],
            ["状态绿", "--success"],
            ["提醒琥珀", "--warning"],
            ["离线红", "--danger"],
          ].map(([name, token]) => (
            <div key={token}>
              <span style={{ background: `var(${token})` }} />
              <b>{name}</b>
              <code>{token}</code>
            </div>
          ))}
        </div>
      </section>
      <div className="detail-grid">
        <section className="panel">
          <h2>状态与操作</h2>
          <div className="design-status">
            {(["online", "offline", "stale", "unknown"] as const).map(
              (state) => (
                <Status key={state} state={state} />
              ),
            )}
          </div>
          <div className="design-buttons">
            <Button>主要操作</Button>
            <Button variant="outline">次要操作</Button>
            <Button disabled>不可用</Button>
          </div>
          <div className="detail-meters">
            <Meter label="资源占用" value={42} />
            <Meter label="高占用" value={84} />
            <Meter label="临界占用" value={95} />
          </div>
        </section>
        <section className="panel">
          <h2>布局与文字</h2>
          <dl>
            <dt>容器圆角</dt>
            <dd>12px 卡片 / 面板</dd>
            <dt>控件圆角</dt>
            <dd>8px</dd>
            <dt>间距基准</dt>
            <dd>4 / 8 / 12 / 16 / 24 / 32px</dd>
            <dt>正文</dt>
            <dd>14px · 最小 12px · 系统无衬线字体</dd>
            <dt>数字</dt>
            <dd>等宽数字 tabular-nums</dd>
            <dt>动效</dt>
            <dd>尊重减少动态效果设置</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
