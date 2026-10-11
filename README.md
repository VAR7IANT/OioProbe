# OioProbe

Your servers, at a glance. 面向个人 VPS 的原创轻量监控界面。

**Phase 0 / Phase 1**：Komari 1.5.1 原生内核 + React 19 / TypeScript / Vite 自定义主题。
不 fork Server/Agent，不重写采集、鉴权或数据库；本阶段不接生产节点、不部署生产。

## 界面预览

当前主题 **0.1.2**：雾白与石墨双主题、点阵地图、三列资源卡片。
[桌面截图](evidence/chromium-desktop-overview-1440.png) · [手机截图](evidence/chromium-desktop-overview-390.png) · [深色截图](evidence/chromium-desktop-overview-dark.png)

## Grok UI

`Grok-UI` 分支另外带有 `apps/grok-ui`：一套独立的公开状态演示（纸色账页与节点曲线）。它不替换上面的主题包，也不连接 Komari 内核，页面数字都是本地模拟。

```bash
npm run dev -w @oioprobe/grok-ui
```

## 一键部署与主题启用

在准备好的测试服务器上执行（需已安装 Docker，并有运行 Docker 的权限）。
以下单条命令启动 Komari 原生面板，固定使用已验收的 **1.5.1**，数据持久化到 Docker 命名卷：

```bash
docker run -d --name oioprobe --restart unless-stopped -p 25774:25774 -v oioprobe-data:/app/data ghcr.io/komari-monitor/komari:1.5.1
```

浏览器打开 `http://服务器IP:25774`，按首次访问引导创建管理员账号。
端口需要可从访问端到达；若已存在同名容器，先检查现有实例，不要重复执行创建命令。
已有 Komari 1.5.1 的用户直接进行下面的主题安装，无需再启动一个面板。

### 安装 OioProbe 主题

上面的命令启动内核；OioProbe 界面通过原生后台安装主题包后启用。

1. 打开仓库 [Actions](https://github.com/VAR7IANT/OioProbe/actions)，选择最近一次成功且运行了主题打包步骤的 `Phase baseline verification`，下载 `phase-baseline-evidence` 并解压。
2. 在解压后的 `artifacts/` 中找到 `oioprobe-theme-0.1.2.zip`。上传这个主题 ZIP，不要上传外层证据 ZIP 或 GitHub 源码 ZIP。
3. 登录 `http://服务器IP:25774/admin`，在主题管理中上传主题包，选择并启用 **OioProbe**，返回首页查看。

也可以在已安装 Git、Node.js 22+ 和 Python 3 的电脑上一条命令生成主题包：

```bash
git clone https://github.com/VAR7IANT/OioProbe.git && cd OioProbe && npm ci && npm run theme:pack
```

生成位置为 `artifacts/oioprobe-theme-0.1.2.zip`，按上面的后台步骤上传启用。
新面板尚未添加节点时会显示空状态；Agent 安装命令由原生后台为各节点生成，本文不提供通用 Token，也不自动接入节点。

查看运行日志与停止测试面板：

```bash
docker logs --tail 100 oioprobe
docker stop oioprobe
```

停止容器保留命名卷数据；再次启动使用 `docker start oioprobe`。
本阶段仅完成原生二进制与主题的隔离验收，Docker 指令按 [Komari 官方部署方式](https://www.komari.wiki/en/install/docker) 编写，尚未做 Docker 实机部署验收。

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
npm run theme:pack                   # artifacts/oioprobe-theme-0.1.2.zip
```

`test:compat` 只启动校验过的内核、绑定 loopback，在 `.local/` 中创建临时 SQLite 数据；
自动完成本地安装、生成随机凭据、创建合成节点、验证接口并清除测试目录。
测试夹具启动前关闭 GeoIP 外部查询；原生二进制保持不变。
没有远程 API 地址选项，不安装真实 Agent。主题选择仅发生于这个一次性实例。

## 已实现

- 总览、本地点阵地理地图、状态与资源卡片。
- 节点搜索、分组/在线状态筛选、卡片/列表视图、节点详情与 CPU 历史基础展示。
- 网络和告警页骨架；深浅色主题与本地显示偏好；可浏览的设计系统。
- 实际 REST 契约适配、WS `get` 轮询、退避重连、过期判定、加载/空/错误/私密站点状态。
- Komari 原生管理入口、标准主题包结构、代码和浏览器验收脚本。

## 范围边界

本阶段的网络/告警页面是明确标注的占位。无生产数据，无 24h 稳定性结论。
CPU 历史仅为基础接入；完整 ECharts 图表、Ping/丢包统计、MapLibre 与告警策略后置。
地区图采用本地地理轮廓与 SVG 投影，标记为地区参考位置，不推断服务器实际坐标。

- [技术架构](docs/ARCHITECTURE.md)
- [阶段与验收标准](docs/PHASES.md)
- [API 契约](docs/API-COMPATIBILITY.md)
- [设计系统](docs/DESIGN-SYSTEM.md)
- [安全边界](docs/SECURITY.md)
- [验收记录](docs/ACCEPTANCE.md)

OioProbe 原创代码 MIT；Komari 版权与许可证保留于 `THIRD-PARTY-NOTICES.md`。
