/** The installable bundle must ship one parseable layer and both runtime dependencies. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'

describe('dsh-avcon-zentao bundle', () => {
  it('declares the two additive plugin rows through its bundle patch', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      dsh?: { bundle?: { patch?: string } }
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    const parsed = yaml.load(
      readFileSync(resolve(root, manifest.dsh!.bundle!.patch!), 'utf8'),
      { schema: entryListSchema },
    )
    if (!Array.isArray(parsed)) throw new TypeError('AVCON ZenTao patch must be a patch list')
    const rows = parsed.flatMap((patch): { id?: string; name?: string }[] =>
      typeof patch === 'object' && patch !== null
        ? (patch as { insert?: { id?: string; name?: string }[] }).insert ?? []
        : [],
    )
    expect(rows).toEqual([
      { id: 'zentao-cli-gateway', name: '@deepseek-ai/dsh-host-zentao-cli-gateway' },
      { id: 'ui-zentao-notifications', name: '@deepseek-ai/dsh-client-ui-zentao-notifications' },
    ])
    expect(manifest.dependencies).toMatchObject({
      '@deepseek-ai/dsh-client-ui-zentao-notifications': 'workspace:^',
      '@deepseek-ai/dsh-host-zentao-cli-gateway': 'workspace:^',
    })
  })
})
