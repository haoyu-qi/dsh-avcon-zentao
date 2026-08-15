# DSH AVCON ZenTao Plugin

AVCON-branded Web customization and a personal ZenTao CLI work center for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

The repository packages the customization as one profile bundle, backed by one Host gateway and one browser plugin. It provides:

- unified AVCON dark and red themes with 2K and 4K layouts;
- a ZenTao connection-state indicator;
- server, account, and password login through the official `zentao-cli`;
- optional persistence of the server and account only;
- automatic retrieval of tasks and Bugs assigned to the authenticated account;
- draggable task and Bug references with the original ZenTao URL and a CLI-first retrieval instruction;
- one bundle lifecycle: installing or removing `@deepseek-ai/dsh-avcon-zentao` activates or deactivates both runtime components and the scoped presentation.

Passwords and ZenTao Tokens are not committed to this repository. The password is passed only to the managed login subprocess environment and is not saved by the browser plugin.

## Compatibility

The overlay targets DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a` and its `0.1.0-rc.5` package line. The installer rejects a directory that is not a DeepSeek Harness checkout. Review upstream changes before applying it to a different revision.

## Install from source

Clone this repository, then apply it to an existing DeepSeek Harness checkout:

```sh
git clone https://github.com/haoyu-qi/dsh-avcon-zentao.git
cd dsh-avcon-zentao
node scripts/install.mjs /absolute/path/to/deepseek-harness
```

Build Harness and activate the single bundle:

```sh
cd /absolute/path/to/deepseek-harness
pnpm install
pnpm run build
node apps/cli/lib/bin.js plugin --profile web add \
  ./packages/bundle/avcon-zentao \
  ./packages/host/zentao-cli-gateway \
  ./packages/client/ui-zentao-notifications
node apps/cli/lib/bin.js web
```

The three local paths are passed in one command because package-manager links do not install a linked workspace package's dependencies into the target profile. Only `@deepseek-ai/dsh-avcon-zentao` declares `dsh.bundle`, so the profile activates one bundle.

## Remove

```sh
node apps/cli/lib/bin.js plugin --profile web remove @deepseek-ai/dsh-avcon-zentao
```

Removing the profile bundle removes both ZenTao runtime rows. Saved server and account convenience fields may remain in browser-local storage; passwords are never stored.

## Repository layout

- `packages/bundle/avcon-zentao` — installable profile bundle and Cordis patch.
- `packages/host/zentao-cli-gateway` — loopback RPC gateway and `zentao-cli` subprocess adapter.
- `packages/client/ui-zentao-notifications` — account UI, status indicator, polling, work-item cards, and drag payloads.
- `overlay` — AVCON presentation, composer drop target, responsive shell integration, and visual assets applied to the compatible Harness checkout.
- `scripts/install.mjs` — deterministic overlay installer and TypeScript project-reference registration.

## Validation

The source was validated in the parent Harness checkout with a complete build, lint, 28 documentation gates, 105 focused bundle/gateway/client tests, isolated profile install/remove checks, and an installed-profile browser boot with no console warnings or errors.

## License

MIT. See [LICENSE](LICENSE).
