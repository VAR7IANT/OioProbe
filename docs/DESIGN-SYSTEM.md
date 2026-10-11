# 原创 UI 设计系统

品牌 OioProbe，标语 **Your servers, at a glance.**。以原创心电式观测标记、轻玻璃容器与紧凑指标卡片构建视觉识别，不复制 jbxx.de 或第三方主题源码。

| Token | 浅色 | 深色 | 用途 |
| --- | --- | --- | --- |
| --background | #f6f8fc | #141820 | 雾白 / 石墨画布 |
| --surface | #ffffff | #1b212b | 内容卡片 |
| --text | #252d3c | #e8edf7 | 主要文字 |
| --muted | #566377 | #a0adbf | 次级信息 |
| --accent | #2c5dde | #82a7ff | 主操作 / 指标 |
| --border | #e7ebf2 | #303947 | 细边界 |
| --success | #137a61 | #62d4b0 | 在线 |
| --warning | #986514 | #e8b565 | 过期 / 高占用 |

节点卡片圆角 12px，概况/地图容器 16px，控件 8px；间距 4/8/12/16/24px，正文系统字体。
顶部导航，<=680px 下拉移动导航；桌面四列节点、中屏三列/两列、手机单列；320px 开始可操作。
地图采用 D3 地理投影 + world-atlas/Natural Earth 本地地理轮廓，支持 2D 世界图、3D 球面投影视图、旋转/缩放/重置/收起及地区筛选。无需 WebGL、第三方瓦片、IP 定位或 API key。地区标记使用参考位置，不声称节点精确坐标。未收录参考位置的地区仍可通过标签筛选。

首页依次为品牌顶部导航、紧凑标题、节点/网络双概况、全宽地区图、筛选排序工具栏与密集节点卡片。移除后台工作空间/固定侧栏/在线比例圆环，恢复参考站的探针信息结构；保持原创样式，不复制第三方背景图、CSS 或主题代码。

组件：Button（Slot + cva，shadcn 风格）、Stat、Meter、Status、NodeCard、World、空/加载/错误状态。
深浅色用 CSS variables；localStorage 仅保存版本化显示偏好，浏览器禁存储时仍可使用。
状态同时使用文字和形状，不单靠颜色；可见键盘焦点、控件 aria-label、skip link、导航 aria-current。
只使用轻微 hover；prefers-reduced-motion 下关闭 transition。无粒子、强渐变或循环装饰动画。
`#/design` 可查看实际 tokens 与组件状态。
