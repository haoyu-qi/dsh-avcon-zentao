/** Personal ZenTao task and Bug center backed by the Host zentao-cli gateway. */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconChevronDownOutline14,
  IconQueueOutline14,
  StateDot,
  type StateDotState,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import css from './ZentaoNotifications.module.css'

type Kind = 'task' | 'bug'
interface Item { id: string; kind: Kind; title: string; status: string; priority: string; deadline: string; url: string }
interface SavedAccount { server: string; account: string }
interface TriggerPosition { left: number; top: number }
interface ConnectionStatus { state: StateDotState; label: string }
interface Snapshot {
  profile: { server: string; account: string }
  tasks: Item[]
  bugs: Item[]
  fetchedAt: string
}

const SAVED_ACCOUNT_KEY = 'dsh.zentao.account.v1'
const ZENTAO_ITEM_MIME = 'application/x-dsh-zentao-item'
const DRAG_THRESHOLD = 4
const VIEWPORT_MARGIN = 16

/** Root-overlay props plus the generic RPC caller owned by Connection. */
export type ZentaoNotificationsProps = PropsRuntime<'shell.overlay'> & { rpc: ClientConnectionRpc }

function resultMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function readSavedAccount(): SavedAccount | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(SAVED_ACCOUNT_KEY)
    if (raw === null) return undefined
    const value = JSON.parse(raw) as Partial<SavedAccount>
    if (typeof value.server !== 'string' || typeof value.account !== 'string') return undefined
    return { server: value.server, account: value.account }
  } catch {
    // Privacy modes and malformed values make the optional convenience unavailable; login remains usable.
    return undefined
  }
}

function writeSavedAccount(account: SavedAccount | undefined): void {
  try {
    if (account === undefined) window.localStorage.removeItem(SAVED_ACCOUNT_KEY)
    else window.localStorage.setItem(SAVED_ACCOUNT_KEY, JSON.stringify(account))
  } catch {
    // Browser storage refusal must not turn a valid ZenTao login into a failed login.
  }
}

function itemText(item: Item): string {
  const label = item.kind === 'task' ? '禅道任务' : '禅道 Bug'
  const title = item.title.replaceAll('\\', '\\\\').replaceAll(']', '\\]')
  return `[${label} #${item.id}｜${title}](<${item.url}>)\n状态：${item.status} · 优先级：P${item.priority} · 截止 / 更新：${item.deadline}\n处理要求：请默认使用禅道 CLI 读取该工作项的最新详情和上下文后再处理。`
}

function connectionStatus(snapshot: Snapshot | undefined, loading: boolean, error: string | undefined): ConnectionStatus {
  if (loading) return { state: 'ongoing', label: snapshot === undefined ? '正在连接' : '已连接，正在拉取' }
  if (error !== undefined) return { state: 'error', label: '连接异常' }
  if (snapshot !== undefined) return { state: 'done', label: '已连接' }
  return { state: 'warning', label: '未连接' }
}

function clampTriggerPosition(left: number, top: number, width: number, height: number): TriggerPosition {
  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
  const conversationLeft = window.innerWidth <= 720
    ? VIEWPORT_MARGIN
    : Math.min(376, window.innerWidth * 0.22 + VIEWPORT_MARGIN)
  return {
    left: Math.min(maxLeft, Math.max(conversationLeft, left)),
    top: Math.min(Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, top)),
  }
}

/** Render account login, automatic refresh controls, and personal task/Bug lists.
 * @param props - framework root share and ZenTao RPC caller.
 * @returns the trigger and optional account panel.
 */
export function ZentaoNotifications({ rpc }: ZentaoNotificationsProps) {
  const initialAccount = useRef(readSavedAccount()).current
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Kind>('task')
  const [snapshot, setSnapshot] = useState<Snapshot>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [intervalMinutes, setIntervalMinutes] = useState(5)
  const [server, setServer] = useState(initialAccount?.server ?? '')
  const [account, setAccount] = useState(initialAccount?.account ?? '')
  const [password, setPassword] = useState('')
  const [rememberAccount, setRememberAccount] = useState(initialAccount !== undefined)
  const [draggingItem, setDraggingItem] = useState<string>()
  const [triggerPosition, setTriggerPosition] = useState<TriggerPosition>()
  const [draggingTrigger, setDraggingTrigger] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const refreshing = useRef(false)
  const triggerDrag = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
    latestX: number
    latestY: number
    moved: boolean
  }>()
  const dragFrame = useRef<number>()
  const suppressTriggerClick = useRef(false)

  const call = useCallback(async (endpoint: 'login' | 'refresh', payload: unknown): Promise<Snapshot> => {
    const result = await rpc.call('/zentao', endpoint, payload)
    if (!result.ok) throw new Error(result.error.message)
    return result.value as Snapshot
  }, [rpc])

  const refresh = useCallback(async (): Promise<void> => {
    if (refreshing.current) return
    refreshing.current = true
    setLoading(true)
    try {
      setSnapshot(await call('refresh', {}))
      setError(undefined)
    } catch (reason) {
      setError(resultMessage(reason))
    } finally {
      setLoading(false)
      refreshing.current = false
    }
  }, [call])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent): void => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (snapshot === undefined) return
    const timer = window.setInterval(() => { void refresh() }, intervalMinutes * 60_000)
    return () => { window.clearInterval(timer) }
  }, [intervalMinutes, refresh, snapshot])

  useEffect(() => {
    const keepTriggerVisible = (): void => {
      const rect = trigger.current?.getBoundingClientRect()
      if (rect === undefined) return
      setTriggerPosition(current => current === undefined
        ? current
        : clampTriggerPosition(current.left, current.top, rect.width, rect.height))
    }
    window.addEventListener('resize', keepTriggerVisible)
    return () => {
      window.removeEventListener('resize', keepTriggerVisible)
      if (dragFrame.current !== undefined) cancelAnimationFrame(dragFrame.current)
    }
  }, [])

  const login = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setLoading(true)
    try {
      const next = await call('login', { server, account, password })
      setSnapshot(next)
      writeSavedAccount(rememberAccount ? next.profile : undefined)
      setPassword('')
      setError(undefined)
    } catch (reason) {
      setError(resultMessage(reason))
    } finally {
      setLoading(false)
    }
  }

  const items = kind === 'task' ? snapshot?.tasks ?? [] : snapshot?.bugs ?? []
  const total = (snapshot?.tasks.length ?? 0) + (snapshot?.bugs.length ?? 0)
  const serviceStatus = connectionStatus(snapshot, loading, error)
  const triggerLabel = snapshot === undefined
    ? `登录禅道，服务${serviceStatus.label}`
    : `禅道，共 ${total} 项，服务${serviceStatus.label}`

  const onRememberChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = event.target.checked
    setRememberAccount(checked)
    if (!checked) writeSavedAccount(undefined)
  }

  const onItemDragStart = (event: React.DragEvent<HTMLElement>, item: Item): void => {
    const text = itemText(item)
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(ZENTAO_ITEM_MIME, JSON.stringify(item))
    event.dataTransfer.setData('text/plain', text)
    setDraggingItem(`${item.kind}-${item.id}`)
  }

  const updateTriggerPosition = (): void => {
    dragFrame.current = undefined
    const drag = triggerDrag.current
    const rect = trigger.current?.getBoundingClientRect()
    if (drag === undefined || rect === undefined) return
    setTriggerPosition(clampTriggerPosition(
      drag.originLeft + drag.latestX - drag.startX,
      drag.originTop + drag.latestY - drag.startY,
      rect.width,
      rect.height,
    ))
  }

  const onTriggerPointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    triggerDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top,
      latestX: event.clientX,
      latestY: event.clientY,
      moved: false,
    }
    suppressTriggerClick.current = false
  }

  const onTriggerPointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const drag = triggerDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    drag.latestX = event.clientX
    drag.latestY = event.clientY
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return
    drag.moved = true
    setDraggingTrigger(true)
    event.preventDefault()
    dragFrame.current ??= requestAnimationFrame(updateTriggerPosition)
  }

  const finishTriggerDrag = (event: React.PointerEvent<HTMLButtonElement>, cancelled: boolean): void => {
    const drag = triggerDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    if (dragFrame.current !== undefined) {
      cancelAnimationFrame(dragFrame.current)
      dragFrame.current = undefined
    }
    drag.latestX = event.clientX
    drag.latestY = event.clientY
    if (drag.moved && !cancelled) updateTriggerPosition()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    suppressTriggerClick.current = drag.moved && !cancelled
    triggerDrag.current = undefined
    setDraggingTrigger(false)
  }

  const onTriggerClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (suppressTriggerClick.current && event.detail !== 0) {
      suppressTriggerClick.current = false
      return
    }
    suppressTriggerClick.current = false
    setOpen(value => !value)
  }

  const panelAbove = triggerPosition !== undefined && triggerPosition.top > window.innerHeight / 2
  const panelAlignLeft = triggerPosition !== undefined && triggerPosition.left < window.innerWidth / 2

  return (
    <div
      ref={root}
      className={css.root}
      style={triggerPosition === undefined ? undefined : { left: triggerPosition.left, top: triggerPosition.top, right: 'auto' }}
      data-panel-above={panelAbove || undefined}
      data-panel-align-left={panelAlignLeft || undefined}
    >
      <button
        ref={trigger}
        type="button"
        className={css.trigger}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-dragging={draggingTrigger || undefined}
        data-connection-status={serviceStatus.state}
        title={`禅道服务：${serviceStatus.label}。拖动调整位置，点击打开禅道`}
        onPointerDown={onTriggerPointerDown}
        onPointerMove={onTriggerPointerMove}
        onPointerUp={(event) => { finishTriggerDrag(event, false) }}
        onPointerCancel={(event) => { finishTriggerDrag(event, true) }}
        onClick={onTriggerClick}
      >
        <span className={css.serviceIcon}>
          <IconQueueOutline14 size={18} />
          <StateDot state={serviceStatus.state} size={10} className={css.connectionDot} />
        </span>
        <span>禅道</span><IconChevronDownOutline14 className={css.chevron} size={12} />
        {total > 0 && <span className={css.badge}>{total}</span>}
      </button>

      {open && (
        <section className={css.panel} role="dialog" aria-label="禅道个人任务中心">
          <header className={css.header}>
            <div><h2>{snapshot === undefined ? '登录禅道' : snapshot.profile.account}</h2><p>{snapshot === undefined ? '连接个人账户，自动拉取名下任务和 Bug' : snapshot.profile.server}</p></div>
            <span className={css.live}>{serviceStatus.label}</span>
          </header>

          {snapshot === undefined ? (
            <form className={css.loginForm} onSubmit={(event) => { void login(event) }}>
              <label>
                服务器地址
                <input
                  type="url"
                  required
                  placeholder="https://zentao.example.com"
                  value={server}
                  onChange={(event) => { setServer(event.target.value) }}
                />
              </label>
              <label>
                账户
                <input
                  required
                  autoComplete="username"
                  placeholder="个人禅道账号"
                  value={account}
                  onChange={(event) => { setAccount(event.target.value) }}
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="仅用于本次 CLI 登录"
                  value={password}
                  onChange={(event) => { setPassword(event.target.value) }}
                />
              </label>
              <label className={css.rememberAccount}>
                <input type="checkbox" checked={rememberAccount} onChange={onRememberChange} />
                <span>记住服务器和账号</span>
              </label>
              {error !== undefined && <p className={css.error}>{error}</p>}
              <button className={css.primary} type="submit" disabled={loading}>{loading ? '正在连接…' : '登录并拉取'}</button>
              <small>勾选后仅在此浏览器保存服务器和账号；密码始终不保存。CLI 登录后会保留 Token。</small>
            </form>
          ) : (
            <>
              <div className={css.toolbar}>
                <div className={css.tabs} role="tablist" aria-label="任务类型">
                  <button type="button" role="tab" aria-selected={kind === 'task'} className={css.tab} onClick={() => { setKind('task') }}>任务 {snapshot.tasks.length}</button>
                  <button type="button" role="tab" aria-selected={kind === 'bug'} className={css.tab} onClick={() => { setKind('bug') }}>Bug {snapshot.bugs.length}</button>
                </div>
                <label className={css.interval}>
                  每
                  <select
                    value={intervalMinutes}
                    onChange={(event) => { setIntervalMinutes(Number(event.target.value)) }}
                  >
                    <option value={1}>1</option>
                    <option value={5}>5</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                  </select>
                  分钟
                </label>
                <button type="button" className={css.refresh} disabled={loading} onClick={() => { void refresh() }}>立即拉取</button>
              </div>
              {error !== undefined && <p className={css.errorBanner}>{error}</p>}
              <div className={css.list}>
                {items.length === 0 ? <div className={css.empty}>当前账户暂无{kind === 'task' ? '任务' : ' Bug'}</div> : items.map(item => (
                  <article
                    key={`${item.kind}-${item.id}`}
                    className={css.notice}
                    draggable
                    data-dragging={draggingItem === `${item.kind}-${item.id}` || undefined}
                    aria-label={`拖拽${item.kind === 'task' ? '禅道任务' : '禅道 Bug'} #${item.id}：${item.title}`}
                    title="拖到交互窗口引用此工作项"
                    onDragStart={(event) => { onItemDragStart(event, item) }}
                    onDragEnd={() => { setDraggingItem(undefined) }}
                  >
                    <span className={css.noticeMark}>{item.kind === 'task' ? 'T' : 'B'}</span>
                    <span className={css.noticeBody}>
                      <span className={css.noticeMeta}>
                        <span>#{item.id} · P{item.priority}</span>
                        <span>{item.status}</span>
                      </span>
                      <strong>{item.title}</strong>
                      <span className={css.detail}>截止 / 更新：{item.deadline}</span>
                      <span className={css.itemActions}>
                        <span className={css.dragHint}>拖到交互窗口</span>
                        <a href={item.url} target="_blank" rel="noreferrer" draggable={false}>打开原始页面</a>
                      </span>
                    </span>
                  </article>
                ))}
              </div>
              <footer className={css.footer}>上次拉取 {new Date(snapshot.fetchedAt).toLocaleTimeString()} · 自动刷新已开启</footer>
            </>
          )}
        </section>
      )}
    </div>
  )
}
