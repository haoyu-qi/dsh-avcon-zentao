import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcHandler, HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess'
import * as ZenTaoGateway from '../src/index.ts'

const contexts: Context[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
})

function output(text: string, exitCode = 0): SubprocessHandle {
  return {
    pid: 1,
    stdin: undefined,
    stdout: undefined,
    stderr: undefined,
    collected: {
      stdout: { readFrom: () => ({ text, nextOffset: text.length, lossy: false }) },
      stderr: { readFrom: () => ({ text: '', nextOffset: 0, lossy: false }) },
    },
    done: Promise.resolve({ exitCode, signal: null }),
    terminate() {},
    async waitForExit() { return true },
  }
}

async function harness(): Promise<{
  call: ConnectionRpcHandler
  specs: SubprocessSpawnSpec[]
  authority: string
}> {
  const ctx = new Context()
  contexts.push(ctx)
  let call: ConnectionRpcHandler | undefined
  let authority = ''
  const specs: SubprocessSpawnSpec[] = []
  const connection: HostConnectionHandle = {
    rpc: {
      handle(channel, handler, options) {
        expect(channel).toBe('/zentao')
        call = handler
        authority = options.authority
        return async () => {}
      },
      intercept() { throw new Error('not used') },
    },
  }
  ctx.provide('connection', connection)
  ctx.provide('subprocess', {
    async resolveExecutable(command: string) { return command },
    spawn(spec: SubprocessSpawnSpec) {
      specs.push(spec)
      if (spec.argv.includes('task')) return output(JSON.stringify({ data: [{ id: 7, name: '交付接口', status: 'doing', pri: 1, deadline: '2026-08-20' }] }))
      if (spec.argv.includes('project')) return output(JSON.stringify({ data: [{ id: 11 }, { id: 12 }] }))
      if (spec.argv.includes('execution')) {
        if (spec.argv.includes('--project=11')) return output(JSON.stringify({ data: [{ id: 21 }, { id: 22 }] }))
        return output(JSON.stringify({ data: [{ id: 22 }, { id: 23 }] }))
      }
      if (spec.argv.includes('product')) return output(JSON.stringify({ data: [{ id: 3 }, { id: 5 }] }))
      if (spec.argv.includes('bug')) return output(JSON.stringify({ data: [{ id: 9, title: '登录失败', status: 'active', priority: 2, openedDate: '2026-08-14', url: '/bug-view-9.html' }] }))
      return output('logged in')
    },
  } as never)
  const fiber = ctx.plugin(ZenTaoGateway)
  await fiber.await()
  if (call === undefined) throw new Error('gateway did not register its RPC handler')
  return { call, specs, authority }
}

describe('zentao-cli gateway', () => {
  it('requires login before refresh and rejects credentials embedded in the URL', async () => {
    const { call, specs, authority } = await harness()
    expect(authority).toBe('loopback')
    await expect(call('refresh', {}, new AbortController().signal)).resolves.toMatchObject({
      ok: false,
      error: { message: '请先登录禅道账户' },
    })
    await expect(call('login', {
      server: 'https://admin:secret@zentao.example.com',
      account: 'admin',
      password: 'secret',
    }, new AbortController().signal)).resolves.toMatchObject({
      ok: false,
      error: { message: '服务器地址不能包含账户或密码' },
    })
    expect(specs).toEqual([])
  })

  it('passes the password only to login and returns assigned task and Bug records', async () => {
    const { call, specs } = await harness()
    const result = await call('login', {
      server: 'https://zentao.example.com/',
      account: ' alice ',
      password: 'secret',
    }, new AbortController().signal)

    expect(result).toMatchObject({
      ok: true,
      value: {
        profile: { server: 'https://zentao.example.com', account: 'alice' },
        tasks: [{ id: '7', kind: 'task', title: '交付接口', status: 'doing', priority: '1', deadline: '2026-08-20', url: 'https://zentao.example.com/index.php?m=task&f=view&taskID=7' }],
        bugs: [{ id: '9', kind: 'bug', title: '登录失败', status: 'active', priority: '2', deadline: '2026-08-14', url: 'https://zentao.example.com/bug-view-9.html' }],
      },
    })
    if (!result.ok) throw new Error('login unexpectedly failed')
    expect(typeof (result.value as { fetchedAt?: unknown }).fetchedAt).toBe('string')
    expect(specs).toHaveLength(10)
    expect(specs[0]?.argv).toEqual(expect.arrayContaining(['login', '--useEnv']))
    expect(specs[0]?.env).toEqual({
      ZENTAO_URL: 'https://zentao.example.com',
      ZENTAO_ACCOUNT: 'alice',
      ZENTAO_PASSWORD: 'secret',
    })
    const listSpecs = specs.filter(spec => spec.argv.includes('task') || spec.argv.includes('bug'))
    expect(listSpecs).toHaveLength(5)
    for (const spec of listSpecs) {
      expect(spec.env).toBeUndefined()
      expect(spec.argv).toEqual(expect.arrayContaining([
        '--format=json',
        '--page=1',
        '--recPerPage=100',
        '--filter=assignedTo=alice',
        '--sort=id_desc',
      ]))
    }
    expect(specs.filter(spec => spec.argv.includes('bug')).map(spec => spec.argv)).toEqual([
      expect.arrayContaining(['--product=3']),
      expect.arrayContaining(['--product=5']),
    ])
    expect(specs.filter(spec => spec.argv.includes('execution')).map(spec => spec.argv)).toEqual([
      expect.arrayContaining(['--project=11']),
      expect.arrayContaining(['--project=12']),
    ])
    expect(specs.filter(spec => spec.argv.includes('task')).map(spec => spec.argv)).toEqual([
      expect.arrayContaining(['--executionID=21']),
      expect.arrayContaining(['--executionID=22']),
      expect.arrayContaining(['--executionID=23']),
    ])
    expect(specs.filter(spec => spec.argv.includes('task')).every(spec => (
      spec.argv.every(argument => !argument.startsWith('--execution='))
    ))).toBe(true)
  })
})
