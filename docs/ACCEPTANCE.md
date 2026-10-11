# Phase 0 / Phase 1 验收记录

更新：2026-10-11，UI 0.1.2。测试范围为本地隔离环境、合成节点与显式演示数据。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| TypeScript strict | PASS | npm run typecheck，退出 0 |
| ESLint / React Hooks | PASS | npm run lint，退出 0 |
| 单元与契约测试 | **29 / 29 PASS** | 26 项客户端契约/WS 生命周期 + 3 项指标展示 |
| Vite 正式构建 | PASS | 默认 live；JS 377.35 kB / gzip 126.62 kB；CSS 30.60 kB / gzip 6.89 kB |
| 原生 Komari 1.5.1 | **17 / 17 PASS** | evidence/native-compat.json |
| 浏览器验收 | **24 / 24 PASS** | evidence/browser-results.json |
| WCAG A/AA 自动扫描 | PASS | 三个浏览器项目中的键盘/axe 深浅色检查 |
| 主题打包 | PASS | artifacts/oioprobe-theme-0.1.2.zip；ZIP 根 manifest + dist |

## 原生内核验证

使用官方未修改的二进制；SHA256 与 lock 一致。
一次性 127.0.0.1 实例验证：版本、公开配置、空节点、HttpOnly 登录、节点白名单、隐藏节点与已上报隐藏记录过滤、REST/RPC parity、v2 合成上报、WS get、历史 CPU=42、Ping 历史/任务、主题资源/图标、原生后台保留、私密站点 401。

额外 Chromium 直接访问原生安装主题，显示 **CPU 42.0% / RAM 50% / disk 50% / 下行 456 B/s / 上行 123 B/s**，点击详情能读取原生历史曲线；无 pageerror。
截图：evidence/native-browser-nodes.png。

内核历史批写间隔 3 秒，测试等待实际记录写入；未修改内核刷新/持久化逻辑。

## 浏览器验收

三个项目：Chromium desktop、Firefox desktop、WebKit + iPhone 13 设备参数。
每个项目 8 个场景：

1. 320 / 375 / 390 / 430 / 768 / 1440px 总览，水平无溢出，节点可见，演示模式提示明确；无 pageerror。
2. 搜索、状态、分组、重置、列表、节点详情、历史时间范围、详情刷新。
3. 移动顶部导航、网络/告警骨架、主题切换和刷新持久化、设计系统、未知节点。
4. HTTP 401、私密站点错误、重试与真实空列表，确保无静默 demo fallback。
5. v2 嵌套字段、过期报告不显示为当前数据。
6. 键盘 skip link 实际聚焦主内容、导航 landmarks、axe WCAG 2 A/AA + 2.1 AA 基础扫描。

7. 顶部探针布局、真实地理轮廓、地区与地图标记筛选、缩放/重置、2D/球面视图切换、键盘旋转、地图收起/展开。
8. 紧凑卡片保留 IEC 单位、资源用量、累计流量与原生运行时间，离线指标留空；CPU 排序。

每个浏览器截图位于 evidence/；中文字体已检查，不是方框字截图。
WebKit 是 Linux 引擎加设备模拟，**不是 iPhone 实机或 macOS Safari 实机**。

## 测试环境说明

容器缺少 CJK 字体和 WebKit 部分共享库，本次把所需字体/库提取到测试环境，未打入产品。
Firefox 在当前容器使用测试进程 sandbox 环境兼容选项；WebKit 使用已提取共享库，并跳过依赖 ldconfig 的宿主预检。
这些都是本地浏览器运行环境调整；应用源码不包含这些开关。标准 CI 用 Playwright --with-deps 安装依赖。

## 尚未验证与下一阶段

- 没有真实 VPS / 原生 Agent 采集对照，也没有生产节点或生产部署。
- 没有 24h 稳定性、真实通知投递、完整 Ping/丢包或备份恢复验收。
- 当前曲线为基础 CPU 接入；完整图表/网络页/告警功能按 PHASES.md 后置。
- GitHub Actions 已完成远端验证，记录见下方。

## 0.1.1 的 main 与推送记录

本地直接 main 开发并提交，无 feature/review 分支。
2026-10-11，用户确认目标仓库 https://github.com/VAR7IANT/OioProbe 后，已通过有写入权限的 GitHub 连接将全部源码和验收证据提交到 main。
终端没有 GitHub 写入凭据，因此采用 Git Data API 导入；远端提交号与原本两次本地提交不同。

- 已验收本地提交：`971e54fcdaa0d49ec7cfdada83cf2e8bdcd38509`。
- 对应远端导入提交：`6781553566c4aa690148acc9f8bf9bd8c10ecf4f`。
- 双方 Git tree 完全相同：`a7c599b3daa985544e8e98533c76b3c9c0e85756`，包含全部 64 个文件。
- 原始本地历史保留在交付的 Git bundle，以及本地 `refs/archive/oioprobe-local-main`。
- 本地 main 已同步远端并跟踪 origin/main；没有接入生产节点或部署生产环境。

2026-10-11，GitHub Actions 对 `8a1456940ea8e6e8c1ba2681acfbea6fdb7a9d87` 完成验证，全部步骤成功：npm ci、类型/Lint/单元/构建检查、Chromium/Firefox/WebKit 浏览器测试、Komari 下载校验与原生兼容性检查、主题 ZIP 打包和证据上传。

- 远端 CI：[Phase baseline verification #2](https://github.com/VAR7IANT/OioProbe/actions/runs/38117606417)。
- 远端产物：该运行的 `phase-baseline-evidence`，包含 CI 生成的证据、主题包和浏览器报告。
- 本次 CI 记录更新仅改本文档；提交使用 `[skip ci]` 避免重复执行未变动的代码测试。

## UI 修订 0.1.1

首版视觉未获用户认可。此次按原定 jbxx.de 产品结构修订为顶部导航、节点/网络双概况、全宽地区地图与密集节点卡片，保留 OioProbe 原创雾白/石墨/蓝视觉，不复制参考站图像或源码。
新增本地地理轮廓、球面投影、筛选/排序、SVG 地区旗帜。球面视图使用 SVG 地理投影，不是 WebGL 三维场景；20 个地区参考位置，其他地区仍可用标签筛选。
技术和浏览器检查通过，**不代表用户已认可视觉效果**。


## UI 优化 0.1.2

针对第二轮视觉反馈，调整数字层级、间距、圆角、阴影、导航与地图比例。桌面节点改为三列，CPU/内存/磁盘横排；移动端保留单列卡片并拆分筛选工具栏。地图为本地点阵地理轮廓。详细 tokens 与断点见 DESIGN-SYSTEM.md。

- 29 项单元检查、24 项三浏览器场景、17 项原生兼容检查通过；没有生产节点或生产部署。
- 增加深色总览、手机首屏、节点详情截图。桌面/移动总览及球面地图截图均已更新。
- 三浏览器均检查深浅色 WCAG A/AA。首轮 WebKit 发现主题切换期间按钮背景渐变导致短暂对比度不足；移除背景色过渡后全套 24 项重跑通过。
- 原生测试夹具在内核启动前关闭 GeoIP，使用空 provider，并让内核的外部 HTTP(S) 代理指向本地不可用端口；加入配置断言，避免测试向 GeoIP 服务查询 IP。原生二进制仍完全未修改。
- 技术验收通过不代表用户已认可视觉效果。截图内均为显式演示或隔离合成数据。

预览：[桌面](../evidence/chromium-desktop-overview-1440.png) · [手机](../evidence/chromium-desktop-overview-390.png) · [深色](../evidence/chromium-desktop-overview-dark.png) · [节点详情](../evidence/chromium-desktop-detail.png)。
