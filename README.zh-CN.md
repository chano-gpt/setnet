# setnet

<p align="center">
  <img src="assets/collie-hero.webp" alt="一只牧羊犬在放牧一群羊" width="640">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/harnesses-7-666666?labelColor=333333" alt="7 harnesses" />
  <img src="https://img.shields.io/badge/runs_on-herdr-666666?labelColor=333333" alt="runs on herdr" />
  <img src="https://img.shields.io/badge/transport-tailscale-666666?labelColor=333333" alt="tailscale" />
  <img src="https://img.shields.io/badge/license-MIT-666666?labelColor=333333" alt="MIT license" />
</p>

<p align="center">
  <a href="README.md">한국어</a> · <a href="README.en.md">English</a> · 简体中文 · <a href="README.ja.md">日本語</a>
</p>

---

**用一台手机，放牧各种各样的编码智能体。**

setnet 是一个手机 web UI，用来监督跑在 [Herdr](https://herdr.dev) 上的智能体群。它只在你的 Tailscale 网络内打开——没有云，没有账号。

和其他工具真正拉开差距的只有一点：**setnet 会区分智能体的种类。** 它不是把终端画面原样镜像丢给你，而是知道每种 harness 能做什么、不该被要求做什么——Claude Code、Codex、pi、OpenCode，以及 **AGY 和 OMO（Senpi）**。

## 目录

- [有什么不同](#有什么不同)
- [支持的 harness](#支持的-harness)
- [核心功能](#核心功能)
- [安装](#安装)
- [安全 — 务必先读](#安全--务必先读)
- [渊源](#渊源)
- [文档](#文档)

## 有什么不同

最接近的替代品是 [Collie](https://github.com/AltanS/collie)——setnet 正是从它分叉出来的。Collie 把所有智能体都当作同一种通用终端镜像。setnet 在其之上加了一层**懂 harness 的机制**。

| | setnet | Collie |
|---|---|---|
| **AGY · OMO（Senpi）支持** | 专属命令目录 + 对话记录适配器 | 无 |
| **启动智能体** | 在应用内启动 6 种智能体，并固化各 harness 的安全参数（Claude 用 `--permission-mode manual`，Codex 用 `--ask-for-approval on-request --sandbox workspace-write`） | 只能连上已经存在的面板 |
| **提示词发送路径** | 在仪表盘上，所有智能体都通过 Herdr `agent.prompt` 直接发送——绕过终端打字 | 只有向 PTY 敲键的路径 |
| **计划进度** | 解析 Senpi 的 todo-state，在对话中显示当前阶段和每项任务的状态（待办／进行中／已完成／已放弃） | 无 |
| **直接从仪表盘下达指令** | 无需进入面板即可发送提示词，输入法安全的草稿，实时的工作耗时 | 必须进入面板 |
| **移动端导航** | 专用标签栏（群／空间，带「需要你」的数量徽标） | 单一仪表盘 |
| **对内置命令的诚实** | 每个目录都标注 `partial`（不完整）与 `insert-only`（不自动执行），并注明来源 | 呈现得仿佛是完整清单 |
| **不受支持的 harness** | 不经两步确认就拒绝输入 | 直接一次性发送 |
| **回复内容校验** | 格式不符的请求会被拒绝 | 缺失字段被静默地填上默认值 |

**安全模型和部署方式原封不动沿用 Collie**——仅回环绑定、`tailscale serve` 单一入口、同源校验。已经被验证过的东西没有理由重做。

## 支持的 harness

| Harness | 命令目录 | 对话历史 | 画面语法识别 | 应用内启动 |
|---|---|---|---|---|
| **AGY**（Antigravity） | ✅ 基于 AGY 1.1.12 | — | — | ✅ |
| **OMO**（Senpi） | ✅ 基于 Senpi 2026.8.12-4 | ✅ + 计划进度 | ✅ | ✅ |
| Claude Code | ✅ | ✅ | ✅ 完整语法 | ✅（`--permission-mode manual`） |
| Codex | ✅ | ✅ | — | ✅（请求审批 + workspace-write 沙箱） |
| pi | ✅ | ✅ | — | ✅ |
| OpenCode | ✅ | ✅ | — | ✅ |
| omp | ✅ | — | ✅ 基础 | — |

「画面语法识别」指的是能从终端画面读出选项、向导和输入框状态的适配器。只有 Claude Code 拥有完整语法（提示选择、向导、预览、多选、菜单），OMO 则共用 omp 的适配器。没有适配器的 harness 会退回通用镜像；没有对话记录适配器的 harness（AGY、omp）不会出现历史功能。

命令目录**是刻意不完整的。** 工作区技能、插件和 MCP 提示词会在运行时追加命令，所以 setnet 只公开自己确实知道的部分，标记为 `partial` 并注明来源。而且**点一下并不会执行**——它只会插入到输入框，发送由你来做。运行时的命令集合会漂移，不受支持的命令可能产生副作用。

## 核心功能

**懂 harness 的操作**
- 各 harness 专属的斜杠命令面板——在输入框敲 `/` 弹出内联菜单，点击插入
- 对没有适配器的 harness 阻止输入，必须通过两步确认才放行
- 在面板中回复时，会先读取画面确认输入框已就绪，验证文字确实进去了，之后才按下发送键——这正是为了防止回车去回答某个抢占了键盘的对话框
- 像 OMO 这种没有可靠终端输入语法的 harness，改用 Herdr 的托管生命周期（`agent.prompt`）发送，完全不碰 PTY

**对话历史**
- 从智能体自己的会话日志读取，能覆盖终端已经滚不回去的部分
- OMO 的计划会渲染成独立区块，包含当前阶段和完成计数
- 实时对话视图给轮询设了上限，页面被遮挡时暂停，并会中断正在进行的请求

**移动优先**
- 可安装到主屏幕的 PWA
- 群／空间标签栏，带上需要你处理的智能体数量徽标
- 仪表盘按**谁在等你**排序，而不是按最后变动时间
- 特殊按键面板（`Esc`、`Ctrl+C`、方向键）、从相册发送图片、在输出中搜索
- 智能体一旦卡住就通过 Web Push 通知你

**完全属于你**
- 跑在你自己的机器上。仅回环绑定，无云端，无账号
- 前门由你决定——默认 `tailscale serve`，或者你自建的反向代理

## 安装

在宿主机上执行——也就是跑智能体的那台机器，不是手机。

```bash
herdr plugin install chano-gpt/setnet
herdr plugin action invoke start --plugin herdr.collie
```

用本地克隆做开发：

```bash
git clone https://github.com/chano-gpt/setnet.git && cd setnet
herdr plugin link "$(pwd)"
herdr plugin action invoke start --plugin herdr.collie
```

> 插件 id 目前仍是 `herdr.collie`。在确认改名不会破坏既有安装之前，保持不变。

需要准备：[Bun](https://bun.sh)、[Herdr](https://herdr.dev) 0.7.0 及以上、[Tailscale](https://tailscale.com)、git。首次运行的横幅、更新和故障排查全都写在[运维手册](OPERATIONS.md)里。

## 安全 — 务必先读

**setnet 在设计上就是对你机器的远程 shell 访问。** 一次调用就能向真实的终端面板输入任意按键。任何能访问该 URL 的人，都能读取所有面板（源码、密钥、环境变量、智能体输出），并以你的身份运行任意命令。没有沙箱，也没有命令白名单——两者中的任何一个都会让这个工具失去意义。**请把这个 URL 当作 root 登录来对待。**

默认启用的防线：

- **仅回环绑定**（`127.0.0.1`）——绝不是 `0.0.0.0`
- **有且仅有一道加固的前门**——`tailscale serve`（默认），或符合规范的反向代理
- **`COLLIE_TRUSTED_USER`**——拒绝除你本人以外的所有 tailnet 账号
- **`COLLIE_DEVICE_HEADER` + `COLLIE_DEVICE_ALLOWLIST`**——按设备控制写权限，其余一律只读
- **`COLLIE_PUBLIC_HOSTS`**——Host 校验，阻断 DNS 重绑定
- 同源校验 + 严格的 CSP；面板输出只会渲染为 React 文本节点

> 🚫 **绝对不要对它使用 `tailscale funnel`。** funnel 会把它暴露到公网。不存在任何一种「对 setnet 用 funnel 是正确的」的场景。

四种部署形态（个人 tailnet／按设备授权的代理／单独的反向代理／跨主机身份代理）的精确配置属于一旦弄错就是事故的领域，因此**保留英文原文而不做翻译**——请阅读[运维手册 → Security](OPERATIONS.md#%EF%B8%8F-security--read-before-you-run-it) 和 [Deployment variants](OPERATIONS.md#deployment-variants)。

按现状提供，不作任何担保。

## 渊源

setnet 从 [AltanS/collie](https://github.com/AltanS/collie) 分叉而来，并在其上叠加了跨 harness 的一层。Collie 率先证明的东西——从手机上放牧智能体确实好用，以及如何安全地把它暴露出去——被完整继承下来。上游打磨出的完整安装、安全与部署文档，以英文原样保存在[运维手册](OPERATIONS.md)中。

## 文档

- 设计理由 — [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 已验证的 Herdr socket API — [`HERDR_API.md`](./HERDR_API.md)
- 运维与版本规则 — [`CLAUDE.md`](./CLAUDE.md)
- 决策记录 — [`.adr/`](./.adr/)
- 变更历史 — [`CHANGELOG.md`](./CHANGELOG.md)
- 安装、安全与部署手册 — [`OPERATIONS.md`](./OPERATIONS.md)
