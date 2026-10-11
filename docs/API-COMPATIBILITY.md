# Komari 1.5.1 API 契约

以 tag `1.5.1` 官方源码为权威，文档的当前版本可能晚于固定版本。
官方参考：
- https://github.com/komari-monitor/komari/tree/1.5.1
- https://komari-document.pages.dev/en/dev/api
- https://komari-document.pages.dev/en/dev/theme

| 接口 | 实际响应与用法 | 本阶段 |
| --- | --- | --- |
| GET /api/version | success/data/version + hash | 内核验证 |
| GET /api/public | success/data/sitename, description, private_site | 配置加载 |
| GET /api/nodes | success/data 数组；隐藏节点过滤，token/IP/remark 置空 | 白名单 DTO |
| WS /api/clients | 发送文本 get；success/data/{online:string[],data:{uuid:v2Report}} | 每秒请求，断流/重连/清理 |
| GET /api/records/load?uuid=&hours=&load_type=all | success/data/{records,count}；记录 flat CPU/ram/net_in/net_out | CPU 历史基础展示 |
| GET /api/records/ping?uuid=&hours= | success/data，可能没有任务/记录 | 原生 smoke 验证，页面后置 |
| GET /api/task/ping | success/data | 原生 smoke 验证，页面后置 |
| POST /api/rpc2 | public:getNodesInformation result 与 REST data 对应 | 原生 parity 检查 |
| GET /api/me | 原始身份对象，不用标准 envelope | 不由通用 get 解包 |
| /admin | 原生管理路径，后台使用原生前端 | 可访问性检查 |

公共 API 错误或 HTTP 401 直接展示；不虚构数据，不绕过私密站点。
Report `ram.used/disk.used/network.up/down` 为 bytes 和 bytes/s；内存/磁盘总量来自 node DTO。
使用 IEC KiB/MiB/GiB；未将字节/s 混成 Mbps。未知字段保持 null/—。
在线比例不等于历史 uptime/SLA，未接 Ping 时不展示延迟/丢包。

WS 最新记录可能仍包含离线节点，必须使用 online UUID 列表判断。
时间戳超过 15 秒或未来超过 5 秒标为过期，时钟偏差需在后续部署时校正。

接口来源文件：`web/router/router.go`、`web/rpc/jsonrpc/public.go`、`web/api/ws.go`、`protocol/v2/jsonrpc.go`。

原生 1.5.1 的 report batch 写入间隔为 3 秒；实时 WS 先于历史落库可见。集成测试轮询等待实际 CPU 历史值，不将瞬时空历史误判为契约失败。
