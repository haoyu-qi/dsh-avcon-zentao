# DSH AVCON 禅道插件

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 AVCON Web 界面定制与个人禅道 CLI 工作中心。

仓库通过一个 profile bundle 统一安装 Host 网关与浏览器插件，提供 AVCON 深色／红色主题、2K／4K 适配、禅道连接状态、账户登录、任务和 Bug 自动拉取、原始链接，以及可拖入对话框的 CLI 优先引用。密码不会保存或提交到仓库。

## 兼容性

当前 overlay 对应 DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a` 和 `0.1.0-rc.5` 包版本。对其他版本使用前，请先检查上游界面文件变化。

## 安装

```sh
git clone https://github.com/haoyu-qi/dsh-avcon-zentao.git
cd dsh-avcon-zentao
node scripts/install.mjs /你的/deepseek-harness/绝对路径
```

然后在 Harness 目录中执行：

```sh
pnpm install
pnpm run build
node apps/cli/lib/bin.js plugin --profile web add \
  ./packages/bundle/avcon-zentao \
  ./packages/host/zentao-cli-gateway \
  ./packages/client/ui-zentao-notifications
node apps/cli/lib/bin.js web
```

三个本地路径放在同一条命令中安装，但只有 `@deepseek-ai/dsh-avcon-zentao` 会成为 profile bundle。

## 卸载

```sh
node apps/cli/lib/bin.js plugin --profile web remove @deepseek-ai/dsh-avcon-zentao
```

## 许可证

MIT，见 [LICENSE](LICENSE)。
