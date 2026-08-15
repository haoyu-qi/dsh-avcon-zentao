# @deepseek-ai/dsh-host-zentao-cli-gateway

English | [中文](README.zh.md)

Loopback-only Host gateway for the official [`zentao-cli`](https://github.com/easysoft/zentao-cli). It owns the `/zentao` Connection RPC channel and exposes two browser operations: `login` authenticates one personal account, and `refresh` retrieves the tasks and Bugs assigned to that account.

Login accepts an HTTP or HTTPS server URL, account, and password. The gateway passes those values to `zentao login --useEnv`; the password exists only in the managed subprocess environment for that invocation. The CLI stores its own server, account, and Token according to its upstream behavior. After login, the gateway retains the active server and account in Host memory. Because the CLI requires an execution scope for task lists, the gateway discovers accessible projects and their executions before aggregating assigned tasks. It similarly discovers assigned Bugs across accessible products. Each record includes its HTTP(S) detail URL: the gateway preserves a URL supplied by the CLI and otherwise derives the standard `index.php` detail route from the authenticated server and item id. Results are sorted by descending id and capped at 100 deduplicated tasks and 100 deduplicated Bugs.

The package registers no LAN-accessible route: Connection enforces `authority: loopback` before invoking its handler. Every CLI process has a 30 second timeout, bounded stdout and stderr capture, ignored stdin, and managed teardown through the Subprocess service. CLI failures return their diagnostic through the existing RPC error result.

## Model Experience

None, as this Host-only account gateway supplies browser data and registers no prompt, tool, message, or provider request.

#### KV Cache effect

None; this package never assembles model input.

## Known Limitations and Deferred Work

- **Process-lifetime profile** — `refresh` requires a successful `login` during the current Host process; the gateway does not recover a retained CLI profile after restart.
- **Bounded discovery** — task discovery visits up to 100 accessible projects until it has found 100 unique executions, then reads at most 100 assigned tasks from each execution. Bug discovery visits the first 100 accessible products and reads at most 100 assigned Bugs from each. Scope queries run in batches of eight, and each result returns the newest 100 unique records.
- **Read-only retrieval** — the RPC channel deliberately exposes no ZenTao mutation operation.
