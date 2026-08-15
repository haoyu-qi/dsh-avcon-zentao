# @deepseek-ai/dsh-avcon-zentao

English | [中文](README.zh.md)

Installable Web-profile bundle for the AVCON shell customization and personal ZenTao CLI work center. One bundle layer mounts the loopback Host gateway and browser plugin together. The browser plugin activates the AVCON dark/red palette, responsive shell decoration, company identity, ZenTao connection-state indicator, account login, automatic task/Bug retrieval, original links, and composer drag references. Removing the bundle removes both runtime rows and deactivates the bundle-scoped presentation.

## Install

From this checkout, build the repository once and add the bundle to the Web profile:

```sh
pnpm run build
node apps/cli/lib/bin.js plugin --profile web add ./packages/bundle/avcon-zentao ./packages/host/zentao-cli-gateway ./packages/client/ui-zentao-notifications
node apps/cli/lib/bin.js web
```

The source-checkout command lists the two local runtime package paths because a package-manager link does not install a linked workspace package's dependencies into the target profile. Only the bundle declares `dsh.bundle`; the Host and browser paths remain ordinary dependencies, so the profile still activates one bundle.

After publication, the profile command accepts the package name directly:

```sh
dsh plugin --profile web add @deepseek-ai/dsh-avcon-zentao
dsh web
```

The published-package command installs the bundle and its two runtime dependencies into the profile, then appends `@deepseek-ai/dsh-avcon-zentao` to `dsh.profile.bundles`. The Web profile must already include `@deepseek-ai/dsh-web-app`, because the bundle adds browser and Host rows to that surface.

## Remove

```sh
dsh plugin --profile web remove @deepseek-ai/dsh-avcon-zentao
```

The profile reconciler removes the bundle layer. Saved server/account convenience fields may remain in browser-local storage; passwords are never stored.

## Model Experience

Indirectly, through dsh-client-ui-zentao-notifications, which owns the draggable composer reference; the bundle itself is a patch-list carrier.

#### KV Cache effect

The bundle has no direct provider request; submitted composer text follows the existing conversation cache behavior.

## Known Limitations and Deferred Work

- **Web profile required** — installing into a profile without the Web bundle leaves the client overlay without its required slots and transport.
- **Published install depends on matching package versions** — the bundle, browser plugin, gateway, and Harness installation use the same release version.
