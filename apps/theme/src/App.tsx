import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  Command,
  ExternalLink,
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
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import {
  nodeStatus,
  percent,
  type NodeInfo,
  type HistoryPoint,
} from "@oioprobe/komari-client";
import { useProbe, client, isDemo } from "./useProbe";
import { demoHistory } from "./demo";
import { Button } from "./components/ui/button";
import { bytes, Meter, NodeCard, Status } from "./components/Metrics";
import { World } from "./components/World";
type Probe = ReturnType<typeof useProbe>;
const nav = [
  ["overview", "总览", LayoutDashboard],
  ["nodes", "节点", Server],
  ["network", "网络", Network],
  ["alerts", "告警", Bell],
  ["settings", "设置", Settings2],
] as const;
function useRoute() {
  const [route, setRoute] = useState(location.hash.slice(2) || "overview");
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(2) || "overview");
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}
export default function App() {
  const probe = useProbe(),
    route = useRoute(),
    page = route.split("/")[0];
  const [menu, setMenu] = useState(false),
    [theme, setTheme] = useState(() => {
      try {
        return localStorage.getItem("oioprobe.theme.v1") === "dark"
          ? "dark"
          : "light";
      } catch {
        return "light";
      }
    });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("oioprobe.theme.v1", theme);
    } catch {
      /* Browser privacy settings may disallow storage. */
    }
  }, [theme]);
  useEffect(() => {
    setMenu(false);
    window.scrollTo(0, 0);
  }, [route]);
  const title =
    nav.find((n) => n[0] === page)?.[1] ??
    (page === "design" ? "设计系统" : "页面未找到");
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
              <Activity size={22} />
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
            <span
              className={`connection ${probe.connection === "connected" && !probe.error ? "good" : ""}`}
            >
              <i />
              {isDemo
                ? "演示模式"
                : probe.error
                  ? "连接失败"
                  : probe.connection === "connected"
                    ? "实时连接"
                    : probe.connection === "reconnecting"
                      ? "正在重连"
                      : "正在连接"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={theme === "light" ? "切换深色主题" : "切换浅色主题"}
              onClick={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </Button>
            <Button variant="outline" asChild className="admin-button">
              <a href="/admin">管理</a>
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
      <div className="main-shell">
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR SERVERS, AT A GLANCE.</div>
              <h1>{page === "overview" ? "服务器总览" : title}</h1>
              <p>
                {page === "overview"
                  ? "每个节点的状态，尽在这一眼。"
                  : "资源、连接与变化，一眼掌握。"}
              </p>
            </div>
            <Button variant="outline" onClick={probe.retry}>
              <RefreshCw size={15} />
              刷新数据
            </Button>
          </div>
          {isDemo ? (
            <div className="demo-banner">
              <Monitor size={15} />
              <span>设计预览 · 所有节点与指标均为演示数据</span>
            </div>
          ) : null}
          {probe.error ? (
            <div className="error-panel" role="alert">
              <ShieldCheck size={27} />
              <h2>无法读取监控数据</h2>
              <p>{probe.error}</p>
              <div>
                <Button onClick={probe.retry}>重试连接</Button>
                <Button asChild variant="outline">
                  <a href="/admin">前往原生管理登录</a>
                </Button>
              </div>
              <small>请确认本地 Komari 正在运行，且 /api 代理配置正确。</small>
            </div>
          ) : probe.loading ? (
            <div className="loading-state" role="status">
              <LoaderCircle size={24} />
              <p>正在读取节点信息…</p>
              <div className="skeleton-grid">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" />
                ))}
              </div>
            </div>
          ) : page === "overview" ? (
            <Overview probe={probe} />
          ) : page === "nodes" && route.includes("/") ? (
            <NodeDetail uuid={decodeRoute(route)} probe={probe} />
          ) : page === "nodes" ? (
            <NodeList probe={probe} />
          ) : page === "network" ? (
            <NetworkPage />
          ) : page === "alerts" ? (
            <Coming icon="alerts" />
          ) : page === "settings" ? (
            <Settings theme={theme} setTheme={setTheme} />
          ) : page === "design" ? (
            <Design />
          ) : (
            <div className="empty-panel">
              <h2>页面未找到</h2>
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
              <span className="footer-dot">·</span> Phase 0 / 1
            </span>
          </footer>
        </main>
      </div>
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
            <span className="summary-hint">
              {stale.length ? `${stale.length} 个数据过期` : "当前连接状态"}
            </span>
          </div>
          <div className="summary-numbers">
            <div>
              <strong>{nodes.length}</strong>
              <span>总节点</span>
            </div>
            <div className="green-text">
              <strong>{live ? online.length : "—"}</strong>
              <span>在线节点</span>
            </div>
            <div>
              <strong>{live ? offline.length : "—"}</strong>
              <span>离线节点</span>
            </div>
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
            <div>
              <span>
                <ArrowDownLeft size={15} />
                下载
              </span>
              <strong>{bytes(sum("down"), true)}</strong>
              <small>累计接收 {bytes(sum("totalDown"))}</small>
            </div>
            <div>
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
    [view, setView] = useState("grid"),
    [sort, setSort] = useState("default");
  const filtered = probe.nodes
    .filter(
      (n) =>
        (!region || n.region === region) &&
        (group === "全部分组" || n.group === group) &&
        (status === "all" ||
          nodeStatus(n.uuid, probe.live, probe.clock) === status) &&
        `${n.name} ${n.region} ${n.group} ${n.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "cpu"
          ? currentCpu(b) - currentCpu(a)
          : b.weight - a.weight,
    );
  function currentCpu(n: NodeInfo) {
    return nodeStatus(n.uuid, probe.live, probe.clock) === "online"
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
            </button>
          ))}
        </div>
        <div className="filter-right">
          <label className="search">
            <Search size={15} />
            <input
              aria-label="搜索节点"
              placeholder="搜索节点…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button aria-label="清除搜索" onClick={() => setQuery("")}>
                <X size={13} />
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
          <div className="view-toggle">
            <button
              aria-label="卡片视图"
              aria-pressed={view === "grid"}
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
          <Server size={30} />
          <h3>{probe.nodes.length ? "没有匹配的节点" : "尚未接入节点"}</h3>
          <p>
            {probe.nodes.length
              ? "试试其他关键词，或重置筛选条件。"
              : "本阶段尚未接入生产节点；空列表是正常状态。"}
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
      <h2>节点不存在或不可访问</h2>
      <a href="#/nodes">返回节点列表</a>
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
  const points = history.filter((p) => p.cpu != null),
    path = points
      .map(
        (p, i) =>
          `${i ? "L" : "M"} ${40 + (i * 700) / Math.max(1, points.length - 1)} ${210 - (p.cpu ?? 0) * 1.6}`,
      )
      .join(" ");
  return (
    <>
      <a className="back-link" href="#/nodes">
        <ArrowLeft size={14} />
        返回节点列表
      </a>
      <div className="detail-heading">
        <span className="server-icon">
          <Server size={22} />
        </span>
        <div>
          <h2>{n.name}</h2>
          <p>
            {n.region} · {n.group} · {n.os}
          </p>
        </div>
        <Status state={state} />
      </div>
      <div className="detail-grid">
        <section className="panel">
          <h2>实时资源</h2>
          <Meter label="CPU" value={r?.cpu ?? null} />
          <Meter label="内存" value={percent(r?.memory, n.memoryTotal)} />
          <Meter label="磁盘" value={percent(r?.disk, n.diskTotal)} />
          <div className="detail-traffic">
            <span>
              <ArrowDownLeft size={15} />
              {bytes(r?.down, true)}
            </span>
            <span>
              <ArrowUpRight size={15} />
              {bytes(r?.up, true)}
            </span>
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
          <p role="alert">{error}</p>
        ) : loading ? (
          <p role="status">读取历史数据…</p>
        ) : points.length ? (
          <svg viewBox="0 0 800 260" role="img" aria-label="CPU 历史折线图">
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line
                  x1="40"
                  y1={210 - v * 1.6}
                  x2="740"
                  y2={210 - v * 1.6}
                  stroke="var(--border)"
                />
                <text x="0" y={214 - v * 1.6} fill="var(--muted)" fontSize="12">
                  {v}%
                </text>
              </g>
            ))}
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
            <text x="40" y="245" fill="var(--muted)" fontSize="12">
              {new Date(points[0].time).toLocaleTimeString()}
            </text>
            <text x="680" y="245" fill="var(--muted)" fontSize="12">
              {new Date(points.at(-1)!.time).toLocaleTimeString()}
            </text>
          </svg>
        ) : (
          <div className="empty-chart">暂无历史记录</div>
        )}
      </section>
    </>
  );
}
function Coming({ icon }: { icon: "alerts" | "network" }) {
  return (
    <div className="coming panel">
      <span className="coming-icon">
        {icon === "alerts" ? <Bell size={30} /> : <Network size={30} />}
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
            <Command size={17} />
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
        <ShieldCheck size={17} />
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
  theme: string;
  setTheme: (v: string) => void;
}) {
  return (
    <div className="settings-grid">
      <section className="panel">
        <h2>显示偏好</h2>
        <p className="muted">保存在当前浏览器，仅影响主题显示。</p>
        <div className="theme-options">
          {[
            ["light", "浅色", Sun],
            ["dark", "深色", Moon],
          ].map(([value, label, Icon]) => {
            const I = Icon as typeof Sun;
            return (
              <button
                key={String(value)}
                aria-pressed={theme === value}
                onClick={() => setTheme(String(value))}
              >
                <I size={21} />
                {String(label)}
                {theme === value ? <Check size={15} /> : null}
              </button>
            );
          })}
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
          <a href="/admin" target="_blank" rel="noreferrer">
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
        <Palette size={24} />
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
          <Meter label="资源占用" value={42} />
          <Meter label="高占用" value={89} />
        </section>
        <section className="panel">
          <h2>布局与文字</h2>
          <dl>
            <dt>卡片圆角</dt>
            <dd>12px 节点 / 16px 容器</dd>
            <dt>控件圆角</dt>
            <dd>8px</dd>
            <dt>间距基准</dt>
            <dd>4 / 8 / 12 / 16 / 24px</dd>
            <dt>正文</dt>
            <dd>14px · 系统无衬线字体</dd>
            <dt>动效</dt>
            <dd>尊重减少动态效果设置</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
