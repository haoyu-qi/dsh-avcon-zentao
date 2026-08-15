# DSH AVCON 禅道插件

中文 | [English](README.en.md)

这是一个面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 AVCON Web 界面定制与个人禅道 CLI 工作中心。

仓库将全部定制整合为一个 profile bundle，由一个 Host 网关和一个浏览器插件共同提供以下能力：

- AVCON 深色与红色主题，统一底图和背景色；
- 针对 2K、4K 分辨率优化的响应式布局；
- 禅道服务连接状态指示；
- 通过官方 `zentao-cli` 登录服务器、账户和密码；
- 可选择只保存服务器地址与账户，密码始终不保存；
- 自动拉取当前账户名下的任务和 Bug；
- 任务和 Bug 卡片保留原始禅道链接；
- 将工作项拖入对话输入框时，自动插入可编辑的 Markdown 引用和 CLI 优先读取说明；
- 安装或移除 `@deepseek-ai/dsh-avcon-zentao` 时，Host 网关、浏览器插件与 AVCON 视觉样式会一起启用或停用。

仓库不包含任何禅道密码、Token 或 API 密钥。密码只会传递给受管的登录子进程环境，不会被浏览器插件保存。

## 兼容性

当前 overlay 对应 DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a` 和 `0.1.0-rc.5` 包版本。安装器会拒绝非 DeepSeek Harness 目录。对其他版本使用前，请先检查上游界面文件是否发生变化。

## 从源码安装

克隆本仓库，并将插件应用到已有的 DeepSeek Harness 检出目录：

```sh
git clone https://github.com/haoyu-qi/dsh-avcon-zentao.git
cd dsh-avcon-zentao
node scripts/install.mjs /你的/deepseek-harness/绝对路径
```

进入 Harness 目录完成依赖安装、构建和 bundle 激活：

```sh
cd /你的/deepseek-harness/绝对路径
pnpm install
pnpm run build
node apps/cli/lib/bin.js plugin --profile web add \
  ./packages/bundle/avcon-zentao \
  ./packages/host/zentao-cli-gateway \
  ./packages/client/ui-zentao-notifications
node apps/cli/lib/bin.js web
```

源码安装时需要在一条命令中列出三个本地路径，因为包管理器的 link 不会把被链接 workspace 包的依赖安装到目标 profile。只有 `@deepseek-ai/dsh-avcon-zentao` 声明了 `dsh.bundle`，所以 profile 实际只会启用一个 bundle。

## 卸载

```sh
node apps/cli/lib/bin.js plugin --profile web remove @deepseek-ai/dsh-avcon-zentao
```

移除 bundle 后，两条禅道运行时记录会一起消失。浏览器本地存储中可能仍保留用户主动保存的服务器和账户字段，但密码从不保存。

## 仓库结构

- `packages/bundle/avcon-zentao`：可安装的 profile bundle 与 Cordis patch；
- `packages/host/zentao-cli-gateway`：仅限回环访问的 RPC 网关和 `zentao-cli` 子进程适配；
- `packages/client/ui-zentao-notifications`：账户界面、连接状态、自动拉取、工作项卡片与拖拽载荷；
- `overlay`：AVCON 视觉样式、输入框拖拽目标、响应式外壳集成和图片资源；
- `scripts/install.mjs`：overlay 安装和 TypeScript project reference 登记脚本。

## 验证结果

代码已在所属 Harness 仓库中完成完整构建和 lint，28 项文档门禁全部通过，105 项 bundle／网关／客户端聚焦测试通过；隔离 profile 的安装、卸载和浏览器启动检查也已通过，控制台没有 warning 或 error。

## 许可证

MIT，见 [LICENSE](LICENSE)。
