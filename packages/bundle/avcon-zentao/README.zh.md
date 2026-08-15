# @deepseek-ai/dsh-avcon-zentao

[English](README.md) | 中文

面向 Web profile 的可安装组合包，包含 AVCON 外壳定制和个人禅道 CLI 工作中心。一个 bundle 层会同时挂载仅限回环访问的 Host 网关和浏览器插件。浏览器插件负责启用 AVCON 深色／红色配色、响应式外壳装饰、企业标识、禅道连接状态、账户登录、任务／Bug 自动拉取、原始链接和输入框拖拽引用。移除该组合包后，两个运行时条目会一起移除，组合包限定的视觉样式也会停用。

## 安装

从当前仓库安装时，先构建一次，再把组合包加入 Web profile：

```sh
pnpm run build
node apps/cli/lib/bin.js plugin --profile web add ./packages/bundle/avcon-zentao ./packages/host/zentao-cli-gateway ./packages/client/ui-zentao-notifications
node apps/cli/lib/bin.js web
```

源码仓库命令需要列出两个本地运行时包路径，因为包管理器的 link 不会把被链接 workspace 包的依赖安装到目标 profile。只有组合包声明 `dsh.bundle`；Host 与浏览器路径仍是普通依赖，因此 profile 只会启用一个 bundle。

发布后可直接使用包名安装：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-avcon-zentao
dsh web
```

使用已发布包名的命令会把组合包及其两个运行时依赖安装到 profile，并将 `@deepseek-ai/dsh-avcon-zentao` 追加到 `dsh.profile.bundles`。Web profile 必须已经包含 `@deepseek-ai/dsh-web-app`，因为本组合包是在该界面上追加浏览器与 Host 条目。

## 移除

```sh
dsh plugin --profile web remove @deepseek-ai/dsh-avcon-zentao
```

profile 协调器会移除该 bundle 层。浏览器本地存储中可能仍保留服务器／账号便捷字段；密码始终不会保存。

## 模型体验

间接影响来自 `@deepseek-ai/dsh-client-ui-zentao-notifications` 所拥有的输入框拖拽引用；组合包自身仅承载 patch 列表。

#### KV Cache 影响

组合包不会直接发起提供方请求；已提交的输入框文本沿用既有对话缓存行为。

## 已知限制与暂缓事项

- **需要 Web profile** —— 安装到不含 Web bundle 的 profile 时，客户端浮层缺少所需插槽和传输层。
- **发布安装要求版本匹配** —— 组合包、浏览器插件、网关与 Harness 安装使用同一个发行版本。
