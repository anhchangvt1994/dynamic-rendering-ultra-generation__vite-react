import { useModal } from 'pages/QuizPage/useModal'
import type { CSSProperties } from 'react'
import EvoArt from './EvoArt'
import { bubbleLayout, STAGE } from './format.mjs'
import { EvolveDialogStyle } from './styles'

export type PromptBranch = {
  to: number
  ready: boolean
  lines: { ok: boolean; text: string }[]
}

type Props = {
  open: boolean
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
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`

/** The prompt (approved Dialog C): one big bubble, or a choice among bubbles. */
export default function EvolveDialog({
  open,
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
}: Props) {
  const ref = useModal(open, onLater)
  const slots = bubbleLayout(branches.length)
  const ready = branches.filter((b) => b.ready)
  const many = branches.length > 1
  const chosen = branches.find((b) => b.to === selected)
  const sprite = STAGE.sprite
  const sub = !many
    ? `${level ? `Lv ${level} · ` : ''}đã đạt điều kiện`
    : ready.length === 1
      ? 'Một dạng đã sẵn sàng'
      : 'Chọn một dạng'
  const label =
    ready.length === 1 || !many || !chosen
      ? 'Tiến hoá'
      : `Tiến hoá thành ${nameOf(chosen.to)}`
  return (
    <EvolveDialogStyle
      ref={ref}
      aria-labelledby="ev-title"
      data-dialog="evolve"
    >
      <div className="ev-panel">
        <h2 id="ev-title">{name} muốn tiến hoá!</h2>
        <p className="ev-sub">{sub}</p>
        <div className="ev-stage" aria-hidden={false}>
          <span
            className="ev-me"
            style={{
              left: pct(sprite.x, STAGE.w),
              top: pct(sprite.y, STAGE.h),
              width: pct(sprite.w, STAGE.w),
              aspectRatio: '1',
            }}
          >
            <EvoArt id={fromId} />
          </span>
          {branches.map((b, i) => {
            const slot = slots[i]
            if (!slot) return null
            const on = b.to === selected
            return (
              <button
                key={b.to}
                type="button"
                className="ev-bub"
                data-on={on || undefined}
                data-lock={!b.ready || undefined}
                data-beat={(on && !many) || (on && ready.length === 1) || undefined}
                data-float={(many && !on) || undefined}
                aria-pressed={b.ready ? on : undefined}
                aria-disabled={!b.ready || undefined}
                aria-label={`${nameOf(b.to)}${b.ready ? '' : ' (chưa đủ điều kiện)'}`}
                style={
                  {
                    left: pct(slot.x, STAGE.w),
                    top: pct(slot.y, STAGE.h),
                    width: pct(slot.size, STAGE.w),
                    animationDelay: `${-i * 0.9}s`,
                  } as CSSProperties
                }
                onClick={() => b.ready && onSelect(b.to)}
              >
                <EvoArt id={b.to} />
                {many && slot.size >= 56 && <small>{nameOf(b.to)}</small>}
              </button>
            )
          })}
        </div>
        <div className="ev-why" role="status">
          {chosen?.lines.map((l, i) => (
            <p key={i} className={l.ok ? 'ev-ok' : 'ev-no'}>
              {l.ok ? '✓' : '✕'} {many ? `${nameOf(chosen.to)}: ` : ''}
              {l.text}
            </p>
          ))}
          {many &&
            branches
              .filter((b) => !b.ready)
              .map((b) => {
                const miss = b.lines.find((l) => !l.ok)
                return (
                  <p key={b.to} className="ev-no">
                    ✕ {nameOf(b.to)}: {miss?.text ?? 'Chưa khả dụng'}
                  </p>
                )
              })}
        </div>
        <p className="ev-err" role="alert">
          {error}
        </p>
        <div className="ev-acts">
          <button
            type="button"
            className="ev-btn"
            data-action="evolve"
            aria-disabled={busy || selected === null || undefined}
            onClick={() => !busy && selected !== null && onConfirm()}
          >
            {busy ? 'Đang tiến hoá…' : label}
          </button>
          <button
            type="button"
            className="ev-btn"
            data-quiet
            data-action="later"
            onClick={onLater}
          >
            Để sau
          </button>
        </div>
      </div>
    </EvolveDialogStyle>
  )
}
