// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ZentaoNotifications } from '../src/client/ZentaoNotifications.tsx'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  Reflect.deleteProperty(Element.prototype, 'setPointerCapture')
  Reflect.deleteProperty(Element.prototype, 'releasePointerCapture')
  Reflect.deleteProperty(Element.prototype, 'hasPointerCapture')
  vi.unstubAllGlobals()
})

beforeEach(() => {
  window.innerWidth = 1920
  window.innerHeight = 1024
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.hasPointerCapture = () => true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

const neverHook = (() => { throw new Error('notification overlay must not read global hooks') }) as never
const snapshot = {
  profile: { server: 'https://zentao.example.com', account: 'dev1' },
  tasks: [{ id: '18', kind: 'task' as const, title: '完成 Web 适配', status: 'doing', priority: '2', deadline: '2026-08-18', url: 'https://zentao.example.com/index.php?m=task&f=view&taskID=18' }],
  bugs: [{ id: '7', kind: 'bug' as const, title: '修复通知刷新', status: 'active', priority: '1', deadline: '2026-08-16', url: 'https://zentao.example.com/index.php?m=bug&f=view&bugID=7' }],
  fetchedAt: '2026-08-15T10:00:00.000Z',
}

function mountNotifications() {
  const call = vi.fn(async () => ({ ok: true as const, value: snapshot }))
  return { call, ...render(<ZentaoNotifications useSessions={neverHook} useWorkspaces={neverHook} rpc={{ call }} />) }
}

describe('ZentaoNotifications', () => {
  it('logs in and switches between personal tasks and Bugs', async () => {
    const { call } = mountNotifications()
    fireEvent.click(screen.getByRole('button', { name: '登录禅道，服务未连接' }))
    fireEvent.change(screen.getByLabelText('服务器地址'), { target: { value: 'https://zentao.example.com' } })
    fireEvent.change(screen.getByLabelText('账户'), { target: { value: 'dev1' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: '登录并拉取' }))
    expect(await screen.findByText('完成 Web 适配')).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Bug 1' }))
    expect(screen.getByText('修复通知刷新')).toBeTruthy()
    expect(call).toHaveBeenCalledWith('/zentao', 'login', {
      server: 'https://zentao.example.com', account: 'dev1', password: 'secret',
    })
  })

  it('closes on Escape', () => {
    mountNotifications()
    fireEvent.click(screen.getByRole('button', { name: '登录禅道，服务未连接' }))
    expect(screen.getByRole('dialog', { name: '禅道个人任务中心' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '禅道个人任务中心' })).toBeNull()
  })

  it('drags within the viewport without opening the panel', () => {
    const { container } = mountNotifications()
    const trigger = screen.getByRole('button', { name: '登录禅道，服务未连接' })
    trigger.getBoundingClientRect = () => ({
      left: 1600, top: 130, width: 120, height: 52, right: 1720, bottom: 182,
      x: 1600, y: 130, toJSON: () => ({}),
    })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 1, clientX: 1660, clientY: 156 })
    fireEvent.pointerMove(trigger, { pointerId: 1, clientX: 900, clientY: 420 })
    fireEvent.pointerUp(trigger, { pointerId: 1, clientX: 900, clientY: 420 })
    fireEvent.click(trigger, { detail: 1 })
    const root = container.firstElementChild as HTMLElement
    expect(root.style.left).toBe('840px')
    expect(root.style.top).toBe('394px')
    expect(screen.queryByRole('dialog', { name: '禅道个人任务中心' })).toBeNull()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: '禅道个人任务中心' })).toBeTruthy()
  })

  it('clamps a dragged trigger and keeps it visible after resize', () => {
    const { container } = mountNotifications()
    const trigger = screen.getByRole('button', { name: '登录禅道，服务未连接' })
    trigger.getBoundingClientRect = () => ({
      left: 1600, top: 130, width: 120, height: 52, right: 1720, bottom: 182,
      x: 1600, y: 130, toJSON: () => ({}),
    })
    fireEvent.pointerDown(trigger, { button: 0, pointerId: 2, clientX: 1660, clientY: 156 })
    fireEvent.pointerMove(trigger, { pointerId: 2, clientX: -500, clientY: 5000 })
    fireEvent.pointerUp(trigger, { pointerId: 2, clientX: -500, clientY: 5000 })
    const root = container.firstElementChild as HTMLElement
    expect(root.style.left).toBe('376px')
    expect(root.style.top).toBe('956px')
    expect(root.hasAttribute('data-panel-above')).toBe(true)
    expect(root.hasAttribute('data-panel-align-left')).toBe(true)
    window.innerWidth = 500
    window.innerHeight = 600
    fireEvent(window, new Event('resize'))
    expect(root.style.left).toBe('364px')
    expect(root.style.top).toBe('532px')
  })

  it('remembers only the server and account after a successful login', async () => {
    const first = mountNotifications()
    fireEvent.click(screen.getByRole('button', { name: '登录禅道，服务未连接' }))
    fireEvent.change(screen.getByLabelText('服务器地址'), { target: { value: 'https://zentao.example.com' } })
    fireEvent.change(screen.getByLabelText('账户'), { target: { value: 'dev1' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '记住服务器和账号' }))
    fireEvent.click(screen.getByRole('button', { name: '登录并拉取' }))
    await screen.findByText('完成 Web 适配')
    expect(window.localStorage.getItem('dsh.zentao.account.v1')).toBe(JSON.stringify({
      server: 'https://zentao.example.com', account: 'dev1',
    }))
    expect(window.localStorage.getItem('dsh.zentao.account.v1')).not.toContain('secret')

    first.unmount()
    mountNotifications()
    fireEvent.click(screen.getByRole('button', { name: '登录禅道，服务未连接' }))
    expect(screen.getByLabelText<HTMLInputElement>('服务器地址').value).toBe('https://zentao.example.com')
    expect(screen.getByLabelText<HTMLInputElement>('账户').value).toBe('dev1')
    expect(screen.getByLabelText<HTMLInputElement>('密码').value).toBe('')
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '记住服务器和账号' }).checked).toBe(true)
  })

  it('publishes a task drag payload for the composer', async () => {
    mountNotifications()
    fireEvent.click(screen.getByRole('button', { name: '登录禅道，服务未连接' }))
    fireEvent.change(screen.getByLabelText('服务器地址'), { target: { value: 'https://zentao.example.com' } })
    fireEvent.change(screen.getByLabelText('账户'), { target: { value: 'dev1' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: '登录并拉取' }))
    const task = await screen.findByLabelText('拖拽禅道任务 #18：完成 Web 适配')
    const setData = vi.fn()
    const dataTransfer = { effectAllowed: 'none', setData }
    fireEvent.dragStart(task, { dataTransfer })
    expect(dataTransfer.effectAllowed).toBe('copy')
    expect(setData).toHaveBeenCalledWith('application/x-dsh-zentao-item', JSON.stringify(snapshot.tasks[0]))
    expect(setData).toHaveBeenCalledWith(
      'text/plain',
      '[禅道任务 #18｜完成 Web 适配](<https://zentao.example.com/index.php?m=task&f=view&taskID=18>)\n状态：doing · 优先级：P2 · 截止 / 更新：2026-08-18\n处理要求：请默认使用禅道 CLI 读取该工作项的最新详情和上下文后再处理。',
    )
  })

  it('shows the ZenTao service connection state on the trigger icon', async () => {
    let resolveLogin: ((result: { ok: true; value: typeof snapshot }) => void) | undefined
    const loginResult = new Promise<{ ok: true; value: typeof snapshot }>((resolve) => { resolveLogin = resolve })
    const call = vi.fn(() => loginResult)
    render(<ZentaoNotifications useSessions={neverHook} useWorkspaces={neverHook} rpc={{ call }} />)
    const disconnected = screen.getByRole('button', { name: '登录禅道，服务未连接' })
    expect(disconnected.dataset.connectionStatus).toBe('warning')
    expect(disconnected.querySelector('[data-state="warning"]')).toBeTruthy()

    fireEvent.click(disconnected)
    fireEvent.change(screen.getByLabelText('服务器地址'), { target: { value: 'https://zentao.example.com' } })
    fireEvent.change(screen.getByLabelText('账户'), { target: { value: 'dev1' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: '登录并拉取' }))
    const connecting = screen.getByRole('button', { name: '登录禅道，服务正在连接' })
    expect(connecting.dataset.connectionStatus).toBe('ongoing')
    expect(connecting.querySelector('[data-state="ongoing"]')).toBeTruthy()

    resolveLogin?.({ ok: true, value: snapshot })
    const connected = await screen.findByRole('button', { name: '禅道，共 2 项，服务已连接' })
    expect(connected.dataset.connectionStatus).toBe('done')
    expect(connected.querySelector('[data-state="done"]')).toBeTruthy()
  })

  it('shows a connection error on the trigger icon', async () => {
    const call = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'internal' as const, message: '服务器不可达', details: {} },
    }))
    render(<ZentaoNotifications useSessions={neverHook} useWorkspaces={neverHook} rpc={{ call }} />)
    fireEvent.click(screen.getByRole('button', { name: '登录禅道，服务未连接' }))
    fireEvent.change(screen.getByLabelText('服务器地址'), { target: { value: 'https://zentao.example.com' } })
    fireEvent.change(screen.getByLabelText('账户'), { target: { value: 'dev1' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: '登录并拉取' }))

    const failed = await screen.findByRole('button', { name: '登录禅道，服务连接异常' })
    expect(failed.dataset.connectionStatus).toBe('error')
    expect(failed.querySelector('[data-state="error"]')).toBeTruthy()
    expect(screen.getByText('服务器不可达')).toBeTruthy()
  })
})
