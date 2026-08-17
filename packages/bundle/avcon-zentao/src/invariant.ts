/** Package-owned invariant companion for the AVCON ZenTao bundle. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-avcon-zentao'

/** Cordis companion plugin name. */
export const name = 'avcon-zentao-bundle-invariant'
/** Service required before the companion can register. */
export const inject = ['invariants']

// No runtime invariant: the package is a static patch-list carrier (a YAML
// document of two loader rows owned by the gateway and notification packages);
// it mounts no service, emits no events, and owns no mutable relation to
// check. Each inserted row's own package carries that row's invariants.
const install: InvariantInstaller = () => {}

/** Register the package invariant companion.
 * @param ctx - Cordis context carrying the invariant registry.
 * @returns the registration disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
