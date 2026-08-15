/** Loopback RPC gateway from the Web shell to the official zentao-cli. */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-subprocess'

export const name = 'zentao-cli-gateway'
export const inject = ['connection', 'subprocess']

interface LoginPayload { server: string; account: string; password: string }
interface Profile { server: string; account: string }
interface Item {
  id: string
  kind: 'task' | 'bug'
  title: string
  status: string
  priority: string
  deadline: string
  url: string
}
interface Snapshot { profile: Profile; tasks: Item[]; bugs: Item[]; fetchedAt: string }

const require = createRequire(import.meta.url)
const cliScript = join(dirname(require.resolve('zentao-cli/package.json')), 'bin/zentao.js')
const OUTPUT_CAP = 1024 * 1024

function failure(message: string): RpcResult<unknown> {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function textField(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    const nested = object(value)
    if (nested !== undefined) {
      const label = nested.realname ?? nested.name ?? nested.account
      if (typeof label === 'string') return label
    }
  }
  return ''
}

function detailUrl(server: string, kind: Item['kind'], row: Record<string, unknown>, id: string): string {
  const supplied = textField(row, 'url', 'link', 'webUrl')
  if (supplied !== '') {
    try {
      const url = new URL(supplied, `${server}/`)
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
    } catch {
      // Invalid CLI link fields fall back to the stable ZenTao detail route below.
    }
  }
  const url = new URL('index.php', `${server}/`)
  url.searchParams.set('m', kind)
  url.searchParams.set('f', 'view')
  url.searchParams.set(kind === 'task' ? 'taskID' : 'bugID', id)
  return url.toString()
}

function normalize(kind: Item['kind'], value: unknown, server: string): Item[] {
  const root = object(value)
  const rows = Array.isArray(value) ? value : root?.data
  if (!Array.isArray(rows)) return []
  return rows.flatMap((candidate): Item[] => {
    const row = object(candidate)
    if (row === undefined) return []
    const id = textField(row, 'id')
    return [{
      id,
      kind,
      title: textField(row, 'name', 'title') || `${kind === 'task' ? '任务' : 'Bug'} #${id}`,
      status: textField(row, 'status') || 'unknown',
      priority: textField(row, 'pri', 'priority') || '-',
      deadline: textField(row, 'deadline', 'resolvedDate', 'openedDate') || '-',
      url: detailUrl(server, kind, row, id),
    }]
  })
}

function rows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const root = object(value)
  return Array.isArray(root?.data) ? root.data : []
}

function loginPayload(value: unknown): LoginPayload {
  const row = object(value)
  const server = row?.server
  const account = row?.account
  const password = row?.password
  if (typeof server !== 'string' || typeof account !== 'string' || typeof password !== 'string') {
    throw new Error('服务器地址、账号和密码均为必填项')
  }
  const url = new URL(server)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('服务器地址必须使用 HTTP 或 HTTPS')
  if (url.username !== '' || url.password !== '') throw new Error('服务器地址不能包含账户或密码')
  if (account.trim() === '' || password === '') throw new Error('账号和密码不能为空')
  return { server: url.toString().replace(/\/$/, ''), account: account.trim(), password }
}

/** Register the loopback-only ZenTao RPC channel.
 * @param ctx - Host context carrying Connection and Subprocess.
 */
export function apply(ctx: Context): void {
  let current: Profile | undefined

  const run = async (args: readonly string[], signal: AbortSignal, env?: Record<string, string>): Promise<string> => {
    const executable = await ctx.subprocess.resolveExecutable(process.execPath, env, signal)
    const handle = ctx.subprocess.spawn({
      argv: [executable, cliScript, ...args],
      cwd: process.cwd(),
      env,
      signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
      graceMs: 3_000,
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: OUTPUT_CAP },
        stderr: { maxBytes: 64 * 1024 },
      },
    })
    const outcome = await handle.done
    const stdout = handle.collected.stdout?.readFrom(0).text ?? ''
    const stderr = handle.collected.stderr?.readFrom(0).text ?? ''
    if (outcome.exitCode !== 0) throw new Error(stderr.trim() || stdout.trim() || 'zentao-cli 执行失败')
    return stdout
  }

  const listTasks = async (profile: Profile, signal: AbortSignal): Promise<Item[]> => {
    const projectOutput = await run([
      'project',
      '--format=json',
      '--pick=id',
      '--page=1',
      '--recPerPage=100',
      '--sort=id_desc',
    ], signal)
    const projectIds = rows(JSON.parse(projectOutput) as unknown)
      .map(candidate => object(candidate)?.id)
      .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
    const executionIds = new Set<string>()
    for (const projectId of projectIds) {
      if (executionIds.size >= 100) break
      const output = await run([
        'execution',
        `--project=${String(projectId)}`,
        '--format=json',
        '--pick=id',
        '--page=1',
        '--recPerPage=100',
        '--sort=id_desc',
      ], signal)
      for (const candidate of rows(JSON.parse(output) as unknown)) {
        const id = object(candidate)?.id
        if (typeof id === 'string' || typeof id === 'number') executionIds.add(String(id))
        if (executionIds.size >= 100) break
      }
    }
    const tasks = new Map<string, Item>()
    const boundedExecutionIds = [...executionIds]
    for (let index = 0; index < boundedExecutionIds.length; index += 8) {
      await Promise.all(boundedExecutionIds.slice(index, index + 8).map(async (executionId) => {
        const output = await run([
          'task',
          `--executionID=${executionId}`,
          '--format=json',
          '--page=1',
          '--recPerPage=100',
          `--filter=assignedTo=${profile.account}`,
          '--sort=id_desc',
        ], signal)
        for (const task of normalize('task', JSON.parse(output) as unknown, profile.server)) tasks.set(task.id, task)
      }))
    }
    return [...tasks.values()]
      .sort((left, right) => Number(right.id) - Number(left.id))
      .slice(0, 100)
  }

  const listBugs = async (profile: Profile, signal: AbortSignal): Promise<Item[]> => {
    const productOutput = await run([
      'product',
      '--format=json',
      '--pick=id',
      '--page=1',
      '--recPerPage=100',
      '--sort=id_desc',
    ], signal)
    const productIds = rows(JSON.parse(productOutput) as unknown)
      .map(candidate => object(candidate)?.id)
      .filter((id): id is string | number => typeof id === 'string' || typeof id === 'number')
    const bugs = new Map<string, Item>()
    for (let index = 0; index < productIds.length; index += 8) {
      await Promise.all(productIds.slice(index, index + 8).map(async (productId) => {
        const output = await run([
          'bug',
          `--product=${String(productId)}`,
          '--format=json',
          '--page=1',
          '--recPerPage=100',
          `--filter=assignedTo=${profile.account}`,
          '--sort=id_desc',
        ], signal)
        for (const bug of normalize('bug', JSON.parse(output) as unknown, profile.server)) bugs.set(bug.id, bug)
      }))
    }
    return [...bugs.values()]
      .sort((left, right) => Number(right.id) - Number(left.id))
      .slice(0, 100)
  }

  const refresh = async (signal: AbortSignal): Promise<Snapshot> => {
    if (current === undefined) throw new Error('请先登录禅道账户')
    const [tasks, bugs] = await Promise.all([listTasks(current, signal), listBugs(current, signal)])
    return { profile: current, tasks, bugs, fetchedAt: new Date().toISOString() }
  }

  ctx.effect(() => ctx.connection.rpc.handle('/zentao', async (endpoint, payload, signal) => {
    try {
      if (endpoint === 'login') {
        const request = loginPayload(payload)
        await run(['login', '--useEnv'], signal, {
          ZENTAO_URL: request.server,
          ZENTAO_ACCOUNT: request.account,
          ZENTAO_PASSWORD: request.password,
        })
        current = { server: request.server, account: request.account }
        return { ok: true, value: await refresh(signal) }
      }
      if (endpoint === 'refresh') return { ok: true, value: await refresh(signal) }
      return failure(`未知禅道操作：${endpoint}`)
    } catch (error) {
      return failure(error instanceof Error ? error.message : String(error))
    }
  }, { authority: 'loopback' }))
}
