import { typesOf } from 'components/pokemon-page/type-index.mjs'
import { itemSprite } from 'pages/QuizPage/items.mjs'
import { useModal } from 'pages/QuizPage/useModal'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { PALETTES } from '../room/roomTheme.mjs'
import { useReducedMotion } from '../room/useMedia'
import {
  accentFor,
  arcSpans,
  holdStep,
  progressOf,
  ringLayout,
} from './chamber.mjs'
import EvoArt from './EvoArt'
import { itemName } from './itemName'
import { EvolveDialogStyle } from './styles'

export type PromptBranch = {
  to: number
  ready: boolean
  lines: { ok: boolean; text: string }[]
}

export type StoneOption = { item: string; targets: number[] }

type Props = {
  open: boolean
  stones?: StoneOption[]
  onStone?: (item: string, to: number) => void
  fromId: number
  name: string
  level: number | null
  branches: PromptBranch[]
  selected: number | null
  nameOf: (id: number) => string
  busy: boolean
  error: string | null
  onSelect: (to: number) => void
  onConfirm: () => void
  onLater: () => void
  /** the scene is on top: the chamber stays mounted underneath, unseen */
  away?: boolean
}

type Form = {
  key: string
  to: number
  item?: string
  ready: boolean
  lines: { ok: boolean; text: string }[]
}

const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  x: ((i * 37) % 100) + (i % 3),
  d: 5 + ((i * 7) % 6),
  t: -((i * 13) % 9),
  s: 3 + (i % 3) * 2,
}))
const FLY_MS = 480
const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)]
}
const arc = (r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(r, a0)
  const [x1, y1] = pt(r, a1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/**
 * The prompt as a "chamber": the Pokémon on a pedestal, the form it can take
 * as a shadow behind it, a ring of conditions around both. Forms sit on the
 * ring: a tap picks a branch, a stone flies into the Pokémon; the evolution
 * itself is confirmed by holding the button until the ring fills.
 */
export default function EvolveDialog({
  open,
  stones = [],
  onStone,
  fromId,
  name,
  level,
  branches,
  selected,
  nameOf,
  busy,
  error,
  onSelect,
  onConfirm,
  onLater,
  away,
}: Props) {
  const ref = useModal(open, onLater)
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)

  const forms = useMemo<Form[]>(
    () => [
      ...branches
        .filter((b) => b.ready || !stones.some((s) => s.targets.includes(b.to)))
        .map((b) => ({
          key: `b${b.to}`,
          to: b.to,
          ready: b.ready,
          lines: b.lines,
        })),
      ...stones.flatMap((s) =>
        s.targets.map((to) => ({
          key: `s${s.item}:${to}`,
          to,
          item: s.item,
          ready: true,
          lines: [
            { ok: true, text: `Có ${itemName(s.item)} · chạm đá để dùng` },
          ],
        }))
      ),
    ],
    [branches, stones]
  )
  const readyBranches = branches.filter((b) => b.ready)
  const [pick, setPick] = useState<string | null>(null)
  const auto =
    forms.length === 1
      ? forms[0].key
      : readyBranches.length === 1 && !stones.length
        ? `b${readyBranches[0].to}`
        : null
  const form = forms.find((f) => f.key === (pick ?? auto)) ?? null
  const many = forms.length > 1
  const lines = form?.lines ?? []
  const progress = progressOf(lines)
  const types = typesOf(form?.to ?? fromId)
  const { a, b } = accentFor(
    PALETTES[types[0] as keyof typeof PALETTES] ?? PALETTES.normal
  )

  // the host builds on `selected` for a branch confirm
  useEffect(() => {
    if (form && !form.item && form.ready && form.to !== selected)
      onSelect(form.to)
  }, [form, selected, onSelect])

  // ---- hold to evolve ----
  const hold = useRef({ h: 0, down: false, raf: 0, last: 0, fired: false })
  const fire = useCallback(() => {
    const s = hold.current
    if (s.fired) return
    s.fired = true
    navigator.vibrate?.(30)
    onConfirm()
  }, [onConfirm])
  const paint = (h: number) => {
    const r = root.current
    if (!r) return
    r.style.setProperty('--h', h.toFixed(3))
    r.dataset.charging = h > 0 ? 'on' : ''
  }
  const loop = useCallback(
    (now: number) => {
      const s = hold.current
      const step = holdStep(s.h, s.down, Math.min(64, now - s.last))
      s.last = now
      s.h = step.h
      paint(s.h)
      if (step.done) {
        s.down = false
        fire()
        return
      }
      s.raf = s.h > 0 || s.down ? requestAnimationFrame(loop) : 0
    },
    [fire]
  )
  const press = (down: boolean) => {
    const s = hold.current
    if (down && s.fired) return
    s.down = down
    if (!s.raf) {
      s.last = performance.now()
      s.raf = requestAnimationFrame(loop)
    }
  }
  useEffect(
    () => () => {
      cancelAnimationFrame(hold.current.raf)
      hold.current.raf = 0
    },
    []
  )
  // a new try after the host gave the dialog back (e.g. an error)
  useEffect(() => {
    if (!busy) hold.current.fired = false
  }, [busy])

  const canHold = Boolean(form && form.ready && !form.item) && !busy
  const holdProps = canHold
    ? {
        onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
          if (e.button || reduced) return
          e.currentTarget.setPointerCapture?.(e.pointerId)
          press(true)
        },
        onPointerUp: () => press(false),
        onPointerCancel: () => press(false),
        onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
          if (reduced || (e.key !== 'Enter' && e.key !== ' ')) return
          e.preventDefault()
          if (!e.repeat) press(true)
        },
        onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          press(false)
        },
      }
    : {}
  // reduced motion and assistive "click" (detail 0) confirm at once
  const onHoldClick = (e: { detail: number }) => {
    if (!canHold) return
    if (reduced || e.detail === 0) fire()
  }

  // ---- stones fly into the Pokémon ----
  const [flying, setFlying] = useState<string | null>(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const spendStone = (f: Form) => {
    if (busy || flying || !f.item) return
    const go = () => onStone?.(f.item as string, f.to)
    if (reduced) return go()
    setFlying(f.key)
    timer.current = window.setTimeout(go, FLY_MS)
  }
  useEffect(() => {
    if (error) setFlying(null)
  }, [error])
  const pickForm = (f: Form) => {
    if (f.item) return spendStone(f)
    if (!f.ready || busy) return
    setPick(f.key)
    onSelect(f.to)
  }

  const nodes = forms.filter((f) => many || f.item)
  const slots = ringLayout(nodes.length)
  const arcs = arcSpans(lines.length)
  const sub = !many
    ? `${level ? `Lv ${level} · ` : ''}${form?.ready ? 'đã đạt điều kiện' : 'chưa đủ điều kiện'}`
    : readyBranches.length === 1 && !stones.length
      ? 'Một dạng đã sẵn sàng'
      : 'Chạm một dạng để chọn'
  const missing = many
    ? branches.filter(
        (x) => !x.ready && x.to !== form?.to && forms.some((f) => f.to === x.to)
      )
    : []
  const label = busy
    ? 'Đang tiến hoá…'
    : !form
      ? 'Chọn một dạng'
      : form.item
        ? 'Chạm viên đá để dùng'
        : !form.ready
          ? 'Chưa đủ điều kiện'
          : reduced
            ? 'Chạm để tiến hoá'
            : 'Giữ để tiến hoá'

  return (
    <EvolveDialogStyle
      ref={ref}
      aria-labelledby="ev-title"
      data-dialog="evolve"
      data-away={away || undefined}
    >
      <div
        className="ch"
        ref={root}
        data-fly={flying ? '' : undefined}
        style={
          {
            '--a': a,
            '--b': b,
            '--p': progress.toFixed(2),
            '--h': 0,
          } as CSSProperties
        }
      >
        <div className="ch-bg" aria-hidden="true" />
        <div className="ch-sparks" aria-hidden="true">
          {SPARKS.map((s, i) => (
            <i
              key={i}
              style={
                {
                  left: `${s.x}%`,
                  width: s.s,
                  height: s.s,
                  animationDuration: `${s.d}s`,
                  animationDelay: `${s.t}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <button
          type="button"
          className="ch-later"
          data-action="later"
          onClick={onLater}
        >
          Để sau
        </button>

        <header
          className="ch-head"
          tabIndex={-1}
          ref={(n) => n?.setAttribute('autofocus', '')}
        >
          <h2 id="ev-title">{name} muốn tiến hoá!</h2>
          <p className="ch-sub">{sub}</p>
        </header>

        <div className="ch-stage" aria-hidden={false}>
          <svg className="ch-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="r-dots" cx="50" cy="50" r="47.6" />
            <circle className="r-inner" cx="50" cy="50" r="31" />
            {arcs.map((s, i) => (
              <path
                key={i}
                d={arc(39, s.a0, s.a1)}
                className="r-arc"
                data-ok={
                  lines.length
                    ? lines[i]?.ok
                      ? ''
                      : undefined
                    : form?.ready
                      ? ''
                      : undefined
                }
              />
            ))}
            <circle
              className="r-charge"
              cx="50"
              cy="50"
              r="47.6"
              pathLength="100"
            />
          </svg>
          <div className="ch-pad" aria-hidden="true">
            <i />
            <i />
          </div>
          {form && (
            <span
              className="ch-ghost"
              data-ready={form.ready || undefined}
              aria-hidden="true"
            >
              <EvoArt id={form.to} />
            </span>
          )}
          <span className="ch-me">
            <EvoArt id={fromId} />
          </span>
          {nodes.map((f, i) => {
            const slot = slots[i]
            const on = form?.key === f.key
            const fly = flying === f.key
            return (
              <button
                key={f.key}
                type="button"
                className="ch-node"
                data-on={on || undefined}
                data-lock={!f.ready || undefined}
                data-stone={f.item ? '' : undefined}
                data-fly={fly || undefined}
                data-action={f.item ? 'use-stone' : 'pick'}
                aria-pressed={f.item ? undefined : on}
                aria-disabled={!f.ready || busy || undefined}
                aria-label={
                  f.item
                    ? `Dùng ${itemName(f.item)} để thành ${nameOf(f.to)}`
                    : `${nameOf(f.to)}${f.ready ? '' : ' (chưa đủ điều kiện)'}`
                }
                style={
                  {
                    left: `${slot.x * 100}%`,
                    top: `${slot.y * 100}%`,
                    width: `${slot.size * 100}%`,
                    '--dx': `calc(${0.5 - slot.x} * var(--s))`,
                    '--dy': `calc(${0.5 - slot.y} * var(--s))`,
                    animationDelay: `${-i * 0.7}s`,
                  } as CSSProperties
                }
                onClick={() => pickForm(f)}
              >
                {f.item ? (
                  <img
                    src={itemSprite(f.item)}
                    alt=""
                    draggable={false}
                    className="stone"
                  />
                ) : (
                  <EvoArt id={f.to} />
                )}
              </button>
            )
          })}
          <span className="ch-flash" aria-hidden="true" />
        </div>

        <ul className="ch-why" role="status">
          {lines.map((l, i) => (
            <li key={i} data-ok={l.ok || undefined}>
              <b aria-hidden="true">{l.ok ? '✓' : '✕'}</b>
              {many && form ? `${nameOf(form.to)}: ` : ''}
              {l.text}
            </li>
          ))}
          {missing.map((m) => (
            <li key={m.to}>
              <b aria-hidden="true">✕</b>
              {nameOf(m.to)}:{' '}
              {m.lines.find((l) => !l.ok)?.text ?? 'Chưa khả dụng'}
            </li>
          ))}
        </ul>
        <p className="ch-err" role="alert">
          {error}
        </p>

        <div className="ch-cta">
          {!form?.item && (
            <button
              type="button"
              className="ch-hold"
              data-action="evolve"
              aria-disabled={!canHold || undefined}
              aria-label={`${label}${form ? ` ${nameOf(form.to)}` : ''}`}
              onClick={onHoldClick}
              onContextMenu={(e) => e.preventDefault()}
              {...holdProps}
            >
              <span aria-hidden="true">✦</span>
            </button>
          )}
          <p className="ch-label" aria-hidden="true">
            {label}
          </p>
        </div>
      </div>
    </EvolveDialogStyle>
  )
}
