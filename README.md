# OioProbe

Your servers, at a glance. 面向个人 VPS 的原创轻量监控界面。

**Phase 0 / Phase 1**：Komari 1.5.1 原生内核 + React 19 / TypeScript / Vite 自定义主题。
不 fork Server/Agent，不重写采集、鉴权或数据库；本阶段不接生产节点、不部署生产。

## 本地开发

Node.js 22+，Python 3（用于主题打包与内核下载）。

```bash
npm ci
npm run dev:demo    # 明确标记的演示数据；本地 UI 预览
npm run dev         # 真实 API 模式，不自动回退到演示
```

真实 API 模式：复制 `apps/theme/.env.example` 为 `.env.development`，设置本地 `VITE_API_TARGET`。
默认代理至 `http://127.0.0.1:25774`；此阶段仅使用隔离的开发实例。
根页面下的 Hash 路由保证 Komari 主题资源路径和页面刷新兼容。

## 验证和主题产物

```bash
npm run check                       # 类型 / ESLint / 单元契约测试 / 构建
npx playwright install --with-deps chromium firefox webkit
npm run test:browser                 # 桌面 + 移动布局 / 状态 / 搜索 / 路由
python3 scripts/fetch-komari.py      # 锁定版本 + 校验官方 SHA256
npm run test:compat                  # 启动一次性本地内核；真实 HTTP / WS 验证
npm run theme:pack                   # artifacts/oioprobe-theme-0.1.0.zip
```

`test:compat` 只启动校验过的内核、绑定 loopback，在 `.local/` 中创建临时 SQLite 数据；
自动完成本地安装、生成随机凭据、创建合成节点、验证接口并清除测试目录。
没有远程 API 地址选项，不安装真实 Agent。主题选择仅发生于这个一次性实例。

## 已实现

- 总览、原创地区示意图、状态与资源卡片。
- 节点搜索、分组/在线状态筛选、卡片/列表视图、节点详情与 CPU 历史基础展示。
- 网络和告警页骨架；深浅色主题与本地显示偏好；可浏览的设计系统。
- 实际 REST 契约适配、WS `get` 轮询、退避重连、过期判定、加载/空/错误/私密站点状态。
- Komari 原生管理入口、标准主题包结构、代码和浏览器验收脚本。

## 范围边界

本阶段的网络/告警页面是明确标注的占位。无生产数据，无 24h 稳定性结论。
CPU 历史仅为基础接入；完整 ECharts 图表、Ping/丢包统计、MapLibre 与告警策略后置。
地区图是原创 SVG 示意，不推断服务器实际坐标。

- [技术架构](docs/ARCHITECTURE.md)
- [阶段与验收标准](docs/PHASES.md)
- [API 契约](docs/API-COMPATIBILITY.md)
- [设计系统](docs/DESIGN-SYSTEM.md)
- [安全边界](docs/SECURITY.md)
- [验收记录](docs/ACCEPTANCE.md)

OioProbe 原创代码 MIT；Komari 版权与许可证保留于 `THIRD-PARTY-NOTICES.md`。
