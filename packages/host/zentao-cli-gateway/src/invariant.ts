/** Package-owned invariant companion for the ZenTao CLI gateway. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-host-zentao-cli-gateway'

/** Cordis companion plugin name. */
export const name = 'host-zentao-cli-gateway-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** No runtime invariant: each validated RPC request owns one bounded CLI process. */
const install: InvariantInstaller = () => {}

/** Register the gateway invariant companion.
 * @param ctx - Host context carrying the invariant registry.
 * @returns the registration disposer.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
