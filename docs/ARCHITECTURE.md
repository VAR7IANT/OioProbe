# 技术基线与架构

2026-10-10，基线锁定 `komari.lock.json` 的 Komari **1.5.1**，SHA `f0cc0fba38ce161935372633cae5248c934e2b23`。
使用稳定 release，官方二进制经 SHA256 校验；未将浮动 `latest`、main snapshot 当作兼容基线。

## 模块边界

| 模块 | 职责 | 事实来源 |
| --- | --- | --- |
| Komari Server / Agent | 采集、SQLite、保留策略、认证、可见性、Agent 协议 | 原生内核 |
| packages/komari-client | REST 解包、白名单 DTO、单位、WS 生命周期 | 锁定版本实际契约 |
| apps/theme | React / TS / Vite、Tailwind v4、shadcn 风格 Slot/cva 按钮、原创 UI | 公共 DTO |
| scripts | 版本下载校验、一次性内核集成验收、标准主题 ZIP | 无生产权限 |
| tests / evidence | Playwright、单元契约测试、截图与机器可读结果 | 可复现本地测试 |

数据流：原生 Agent → Komari 内核 → REST / WS → 兼容层 → React 页面。
UI 不接收 Agent token、IP、私有 remark，不将 UI 用作权限判断层。
管理员操作链接 `/admin`；不把原生后台封装为无效的自定义按钮。

## 运行与主题接入

开发模式默认真实 API，由 Vite 同源代理 `/api`（启用 WS）与 `/admin`。
`npm run dev:demo` 使用独立 `.env.demo`，顶部永久显示演示提示；真实模式出错不会自动切演示。
生产主题构建默认真实 API；不含私钥、API Key 或 Agent token。
ZIP 根目录含 `komari-theme.json` 与 `dist/`；资源地址 `/assets/...`。
页面路由 `#/overview`、`#/nodes`、`#/nodes/:uuid`、`#/network`、`#/alerts`、`#/settings`、`#/design`。
不会占用原生 `/admin` 的 path 路由。

## 实时状态

1. 公共站点配置和节点列表并行获取。
2. 建立 `/api/clients` WebSocket，打开后发送 `get`，每秒重新请求。
3. 最后成功响应超过 12 秒则重建连接；重连退避 1/2/4/8/16/30 秒。
4. 节点仅在 online 列表且 report `updated_at` 距当前 <=15 秒时显示在线指标。
5. 离线、过期、未知独立展示；不把断流时的缓存当作最新数值。
6. 卸载关闭连接并清理轮询、重连计时器，避免 StrictMode 重复订阅。

当前页面每秒进行轻量渲染，未引入长时间运行曲线缓存。
当前地区地图使用本地 D3 SVG 地理/球面投影，无外部瓦片或 WebGL 依赖；后续按实际需要引入 ECharts/MapLibre、批量更新与局部订阅。

## 升级策略

升级先修改 lock，核对官方路由 / public DTO / v2 report，再执行单元、原生集成、主题资产和浏览器验收。
版本对外只宣称已验证的 1.5.1；不声称所有历史版本都兼容。
