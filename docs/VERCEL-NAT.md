# OioProbe Vercel + NAT VPS 部署

## 架构

- Vercel：仅构建 `apps/theme` 静态网页，不持有 Agent Token、不运行 Komari。
- NAT VPS：运行 Komari 1.5.1 及 cloudflared；负责 Agent 上报、数据存储、管理后台。
- Cloudflare Tunnel：例如 `https://komari.example.com`，代理到 NAT VPS 本地 `http://127.0.0.1:25774`；在容器化 cloudflared 的情况下应使用 Compose 服务名 `http://oioprobe:25774`。
- 浏览器：在 Vercel 网页上直连 Tunnel 的 HTTPS API 和 WSS WebSocket，不经过 Vercel 重写或代理；管理按钮直接打开 Komari 后台。

此模式仅适用于公开可读的 Komari 状态页面。**私密站点需另行设计登录流程，不能通过前端注入 Token。**

## 1. 准备 NAT 主控和 HTTPS Tunnel

在 NAT VPS 上用 [Komari 官方安装流程](https://komari.wiki/) 或 Docker 启动 Komari **1.5.1**，绑定本机 `127.0.0.1:25774`，不要公开暴露此端口。启动 Cloudflare Tunnel，并在 Zero Trust / Tunnels 添加 Public Hostname（例如 `komari.example.com`），Service URL 指向本机 `http://127.0.0.1:25774` 或同一 Docker 网络的 `http://oioprobe:25774`。

Tunnel 域名首次公开前，应先在本机完成 Komari 管理员初始化。请确保 Agent 可以连接 Tunnel 域名，且不能对整个域名施加需要浏览器登录的人机验证，否则 Agent 和 WebSocket 可能中断。

## 2. 创建 Vercel 项目

- GitHub 仓库：`VAR7IANT/OioProbe`；生产分支：`main`。
- Vercel Root Directory：`./`（仓库根目录）。
- 由仓库根目录的 `vercel.json` 执行 `npm ci` 和 `npm run build:vercel -w @oioprobe/theme`，输出 `apps/theme/dist`。
- **必要环境变量**：`VITE_KOMARI_ORIGIN=https://komari.example.com`（替换为你的真实 Tunnel HTTPS 域名；不带路径或尾随端口也可以）。
- 不要配置 `VITE_DATA_MODE=demo`。Vercel 模式即使无主控也不会退回模拟数据。

`VITE_KOMARI_ORIGIN` 会进入公开浏览器脚本，必须是公开后端地址，**不能填 Token、密码或私有 IP**。修改后必须重新部署，Vite 环境变量在构建阶段固定。

## 3. 配置 Komari Origin 白名单（必需）

在 Komari 原生管理后台找到跨域 / 安全相关设置（1.5.1 中字段为 `cors_allowed_origins` 和 `ws_allowed_origins`）。

- 保持 `cors_origin_check_enabled = true`。
- 保持 `ws_origin_check_enabled = true`。
- 两个允许来源列表都添加 **确切的 Vercel 生产网址**（例如 `https://oioprobe.vercel.app`），自定义前端域名也需要单独添加（如 `https://probe.example.com`）。
- 多个来源可以用逗号或换行分隔；不要使用 `*`，不要全局关闭 Origin 检查。
- 允许来源是 **网页的 Origin**，不是 Tunnel 后端的 Origin，也不是 API 地址的 URL path。

Komari 1.5.1 的 `web/security/cors.go` 和 `web/api/WebSocket.go` 已支持以上配置。

## 4. 验收

1. 浏览器访问 `https://komari.example.com/api/public`，确认返回 Komari JSON。
2. Vercel 前端开发者工具 Network 中应能看到 `https://komari.example.com/api/nodes`（200），和 `wss://komari.example.com/api/clients`（101 Switching Protocols）。
3. 状态应显示「实时连接」，节点信息和 CPU 等指标来自真实服务器；断线时不应自动出现演示节点。
4. 点击「管理」应在新标签页打开后端的 `/admin`。
5. 若网络请求出现 403/CORS、WS 断开，分别检查 Komari HTTP 与 WS 允许来源；若 Tunnel 返回 502，检查 NAT 侧内网地址和端口。
6. 如需自定义前端域名，先在 Vercel 绑定域名，再把 **最终网页 Origin** 添加到两个 Komari 白名单。

安全说明：Vercel 网页**只读取公开 API**，跨域请求不携带后台 Cookie，不运行远程终端。Komari 管理后台独立受原生认证保护。请不要在本仓库中提交 Tunnel Token 或 Agent Token。
