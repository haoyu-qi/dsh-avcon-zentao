# @deepseek-ai/dsh-host-zentao-cli-gateway

[English](README.md) | 中文

基于官方 [`zentao-cli`](https://github.com/easysoft/zentao-cli) 的仅限回环访问 Host 网关。它拥有 `/zentao` Connection RPC 通道并向浏览器公开两个操作：`login` 认证一个个人账户，`refresh` 拉取分配给该账户的任务和 Bug。

登录操作接收 HTTP 或 HTTPS 服务器地址、账户和密码。网关将这些值传给 `zentao login --useEnv`；密码只存在于该次调用的受管子进程环境中。CLI 按照上游行为自行保存服务器、账户和 Token。登录后，网关在 Host 内存中保留当前服务器与账户。由于 CLI 要求任务列表必须指定执行范围，网关会先发现可访问项目及其执行，再通过禅道 API 的 `status=assignedtome`（指派给我）范围聚合当前账户的任务；Bug 则在可访问产品中通过 `browseType=assigntome` 范围聚合。每条记录都包含 HTTP(S) 详情链接：CLI 返回链接时网关直接保留，否则根据已认证服务器和工作项 id 生成标准 `index.php` 详情路由。结果按 id 倒序排列，并限制为 100 条去重任务和 100 条去重 Bug。

本包不注册可从局域网访问的路由：Connection 在调用处理程序前强制执行 `authority: loopback`。每个 CLI 进程都有 30 秒超时、受限的 stdout 和 stderr 捕获、关闭的 stdin，并由 Subprocess 服务执行受管资源释放。CLI 失败通过现有 RPC 错误结果返回其诊断。

## 模型体验

无，因为这个仅限 Host 的账户网关只向浏览器提供数据，不注册提示词、工具、消息或提供方请求。

#### KV Cache 影响

无；本包从不组装模型输入。

## 已知限制与暂缓事项

- **账户仅在进程生命周期内有效** —— `refresh` 要求当前 Host 进程已成功执行 `login`；网关不会在重启后恢复 CLI 保留的账户。
- **受限发现** —— 任务发现最多访问前 100 个可访问项目，直到找到 100 个唯一执行，再从每个执行读取最多 100 条已分配任务。Bug 发现访问前 100 个可访问产品，并从每个产品读取最多 100 条已分配 Bug。范围查询以八个为一批执行，两类结果各自返回最新的 100 条唯一记录。
- **只读拉取** —— RPC 通道刻意不公开任何禅道修改操作。
