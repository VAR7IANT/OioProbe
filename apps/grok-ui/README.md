# OioProbe Grok UI

独立的公开状态界面，放在 `Grok-UI` 分支，不替换 `apps/theme`，也不连接 Komari 内核。

纸色底、墨色界面，潮青绿只表示信号。总览是可筛选的账页，可切成卡片；点进节点看 CPU、内存、吞吐和延迟。数字全部由本地模型生成，页面上有持续提示。地址使用 RFC 5737 / RFC 3849 文档网段。

```bash
npm run dev -w @oioprobe/grok-ui
```

开发服务在 `http://127.0.0.1:5174`。
