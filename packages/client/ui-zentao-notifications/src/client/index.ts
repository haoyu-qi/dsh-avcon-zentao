/** Register the ZenTao product-line notifications overlay. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { createElement } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { ZentaoNotifications } from './ZentaoNotifications.tsx'

/** Services required by the ZenTao notifications plugin. */
export const inject = ['slots', 'theme', 'connection']

/** Mount the additive frame overlay entry.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  const connection = (ctx as ClientContext & { connection: ConnectionHandle }).connection
  if (ctx.theme.getTheme().preference === 'system') ctx.theme.setTheme('dark')
  ctx.effect(() => {
    document.body.dataset['avconZentao'] = ''
    return () => { delete document.body.dataset['avconZentao'] }
  })
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'zentao-notifications',
    order: 10,
  }, props => createElement(ZentaoNotifications, { ...props, rpc: connection.rpc })))
}
