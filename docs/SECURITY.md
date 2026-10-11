# 本阶段安全与运行边界

- Server 和 Agent 保持 Komari 原生，不制作自定义认证、不存前端 Bearer API Key。
- 兼容 DTO 不保留 IP、Agent token、私有 remark；这不替代内核的可见性控制。
- 不处理富文本 HTML；名称、描述和错误均由 React 文本转义。
- 演示仅由显式构建环境启用。正式构建和真实模式不会在失败时悄悄展示 demo。
- 本地兼容脚本校验官方 SHA256，绑定 127.0.0.1，随机凭据不入库，临时数据库运行后清除。
- CI/local 测试报告不记录 cookie/password/token。版本 lock/合成 node DTO 可以提交。
- 本轮不执行真实节点安装、SSH、远程命令、生产部署或通知渠道配置。
- `/admin` 跳转由原生鉴权保护；UI 中的入口不授予权限。

后续生产前：审查 Komari 原生远程管理功能与 Agent 权限，明确启用范围；TLS、Cookie、来源校验、备份恢复、升级契约与长稳性单独验收。
