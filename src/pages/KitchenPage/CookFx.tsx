import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { itemById, itemSprite } from 'pages/QuizPage/items.mjs'
import { scaleStats } from './batch.mjs'
import DishArt from './DishArt'
import type { CookResult } from './engine/types'
import StatChips from './StatChips'

type Props = {
  /** what went in */
  pot: string[]
  /** null while it cooks */
  result: CookResult | null
  /** the colour the pot glows in (its strongest flavour) */
  glow: string
  onClose: () => void
  /** what opened it (read on the click: by now the button is disabled) */
  opener: HTMLElement | null
}

export const COOK_MS = 1900

// a batch's plates: at most this many drawn, the number says the rest
const STACK = 5

/** The batch's count rolling up to n (n at once with reduced motion). */
function useRollUp(n: number) {
  const [shown, setShown] = useState(() =>
    n <= 1 || matchMedia('(prefers-reduced-motion: reduce)').matches ? n : 1
  )
  useEffect(() => {
    if (shown >= n) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      // 600ms, eased out, after the dish has landed
      const t = Math.min(1, Math.max(0, (now - start - 350) / 600))
      setShown(Math.max(1, Math.round(1 + (n - 1) * (1 - (1 - t) ** 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // once per result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n])
  return shown
}

function DishCount({ count, name }: { count: number; name?: string }) {
  const shown = useRollUp(count)
  return (
    <h2 className="cf-title" aria-label={`+${count} ${name ?? ''}`}>
      <span className="cf-count" aria-hidden="true">
        +{shown}
      </span>{' '}
      {name}
    </h2>
  )
}

const PotArt = () => (
  <svg className="cf-pot" viewBox="0 0 160 130" aria-hidden="true">
    <g className="cf-lid">
      <ellipse
        cx="80"
        cy="38"
        rx="50"
        ry="10"
        fill="#e3a26b"
        stroke="#172d45"
        strokeWidth="4"
      />
      <rect
        x="70"
        y="20"
        width="20"
        height="12"
        rx="5"
        fill="#c97b45"
        stroke="#172d45"
        strokeWidth="4"
      />
    </g>
    <path
      d="M22 46h116l-8 58a18 18 0 0 1-18 16H48a18 18 0 0 1-18-16z"
      fill="#d98a4e"
      stroke="#172d45"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <path
      d="M34 56h92"
      stroke="#f3c08f"
      strokeWidth="6"
      strokeLinecap="round"
      opacity="0.8"
    />
    <path
      d="M10 56h14M136 56h14"
      stroke="#172d45"
      strokeWidth="7"
      strokeLinecap="round"
    />
  </svg>
)

/**
 * The cooking: the ingredients arc into the copper pot, the lid rattles,
 * steam swirls and the pot glows; then what came out. A dish spins up in
 * sparkles; a secret one flips from its silhouette ("MÓN MỚI!"); a failure
 * puffs black smoke and half the pot comes back.
 */
export default function CookFx({ pot, result, glow, onClose, opener }: Props) {
  // the portions of a batch (1 for a pot, or a server from before batches)
  const count = result?.outcome === 'dish' ? (result.count ?? 1) : 1
  const closeRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (result) closeRef.current?.focus()
  }, [result])

  // NOTE - A modal: it takes the focus while it cooks, keeps Tab inside, and
  // gives the focus back to what opened it (the button may be disabled for a
  // frame, or gone: then its tab panel)
  useEffect(() => {
    const panel = opener?.closest<HTMLElement>('[role="tabpanel"]')
    rootRef.current?.focus()
    return () => {
      requestAnimationFrame(() => {
        if (opener?.isConnected && !(opener as HTMLButtonElement).disabled)
          opener.focus()
        else panel?.focus()
      })
    }
    // the opener of this cooking only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && result) {
      event.preventDefault()
      onClose()
    } else if (event.key === 'Tab') {
      // one button at most: the focus stays on it (or on the dialog)
      event.preventDefault()
      ;(closeRef.current ?? rootRef.current)?.focus()
    }
  }

  return (
    <CookFxStyle
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="cook-fx"
      role="dialog"
      aria-modal="true"
      aria-label="Đang nấu"
      style={{ '--glow': glow } as CSSProperties}
      data-phase={result ? result.outcome : 'cooking'}
    >
      <div className="cf-stage">
        {!result && (
          <>
            <span className="cf-glow" />
            {pot.map((id, i) => (
              <img
                key={i}
                className="cf-fly"
                src={itemSprite(id)}
                alt=""
                width={30}
                height={30}
                style={{ '--i': i, '--n': pot.length } as CSSProperties}
              />
            ))}
            <PotArt />
            <span className="cf-steam">
              <i />
              <i />
              <i />
            </span>
            <p className="cf-status" role="status">
              Đang nấu…
            </p>
          </>
        )}
        {result?.outcome === 'dish' && (
          <section
            className="cook-result"
            data-outcome="dish"
            data-discovered={result.discovered || undefined}
            aria-live="polite"
          >
            {result.discovered && <p className="cf-new">MÓN MỚI!</p>}
            <span className="cf-sparkles" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
            {result.discovered ? (
              <span className="reveal">
                <span className="reveal-back">
                  <DishArt
                    kind={result.dish.kind}
                    top={result.dish.top}
                    secret
                    size={150}
                  />
                </span>
                <span className="reveal-front">
                  <DishArt
                    kind={result.dish.kind}
                    top={result.dish.top}
                    size={150}
                    steam
                  />
                </span>
              </span>
            ) : (
              <span className="cf-stack" data-count={Math.min(count, STACK)}>
                {/* the batch's other plates, under the first */}
                {Array.from({ length: Math.min(count, STACK) - 1 }, (_, i) => (
                  <span
                    key={i}
                    className="cf-plate"
                    style={{ '--i': i + 1 } as CSSProperties}
                    aria-hidden="true"
                  >
                    <DishArt
                      kind={result.dish.kind}
                      top={result.dish.top}
                      size={150}
                    />
                  </span>
                ))}
                <DishArt
                  className="cf-dish"
                  kind={result.dish.kind}
                  top={result.dish.top}
                  size={150}
                  steam
                />
              </span>
            )}
            <DishCount count={count} name={result.dish.name} />
            {result.dish.stats && (
              <StatChips stats={scaleStats(result.dish.stats, count)} />
            )}
            <button
              ref={closeRef}
              type="button"
              className="result-close"
              onClick={onClose}
            >
              Tiếp tục
            </button>
          </section>
        )}
        {result?.outcome === 'failed' && (
          <section
            className="cook-result"
            data-outcome="failed"
            aria-live="polite"
          >
            <span className="cf-smoke" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <PotArt />
            <p className="cf-oops">Ối!</p>
            <h2 className="cf-title">Món này hỏng mất rồi</h2>
            <p className="cf-near">
              {result.near > 0
                ? `Có ${result.near} nguyên liệu nằm trong một công thức bí ẩn!`
                : 'Chẳng nguyên liệu nào hợp với một công thức bí ẩn.'}
            </p>
            <p className="cf-back">
              Trả lại kệ:{' '}
              {result.returned.map((id, i) => (
                <span key={i} className="cf-back-item">
                  <img src={itemSprite(id)} alt="" width={24} height={24} />
                  {itemById(id).name}
                </span>
              ))}
            </p>
            <button
              ref={closeRef}
              type="button"
              className="result-close"
              onClick={onClose}
            >
              Thử lại
            </button>
          </section>
        )}
      </div>
    </CookFxStyle>
  )
}

const CookFxStyle = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 16px;
  background: radial-gradient(
    circle at 50% 45%,
    rgba(255, 236, 214, 0.92),
    rgba(70, 38, 52, 0.88)
  );
  animation: cf-in 240ms ease-out both;
  outline: none;

  .cf-stage {
    position: relative;
    display: grid;
    place-items: center;
    width: min(100%, 380px);
    /* one size for the cooking and its result: nothing moves when it turns */
    height: min(560px, calc(100dvh - 32px));
    overflow-y: auto;
  }
  .cf-pot {
    width: 180px;
  }
  .cf-glow {
    position: absolute;
    width: 260px;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, var(--glow), transparent 65%);
    opacity: 0.55;
    animation: cf-pulse 600ms ease-in-out infinite alternate;
  }
  .cf-lid {
    transform-origin: 80px 38px;
    animation: cf-rattle 180ms linear 500ms infinite;
  }
  .cf-fly {
    position: absolute;
    top: 0;
    left: calc(50% - 15px + (var(--i) - (var(--n) - 1) / 2) * 56px);
    image-rendering: pixelated;
    animation: cf-fly 700ms cubic-bezier(0.5, 0, 0.75, 0) calc(var(--i) * 120ms)
      both;
  }
  .cf-steam {
    position: absolute;
    top: 60px;
    display: flex;
    gap: 18px;
  }
  .cf-steam i {
    width: 14px;
    height: 40px;
    border-radius: 50%;
    border-left: 4px solid rgba(255, 255, 255, 0.9);
    animation: cf-steam 900ms ease-in-out infinite;
  }
  .cf-steam i:nth-child(2) {
    animation-delay: 300ms;
  }
  .cf-steam i:nth-child(3) {
    animation-delay: 600ms;
  }
  .cf-status {
    margin: 12px 0 0;
    color: #6b3446;
    font-weight: 800;
  }

  .cook-result {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 10px;
    width: 100%;
    padding: 24px 18px 20px;
    border: 3px solid #172d45;
    border-radius: 24px;
    background: #fffaf3;
    color: #172d45;
    text-align: center;
    box-shadow: 6px 6px 0 #172d45;
    animation: cf-pop 420ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }
  .cf-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
  }
  .cf-dish {
    position: relative;
    animation: cf-spin-up 800ms cubic-bezier(0.2, 1.3, 0.4, 1) both;
  }
  .cf-count {
    display: inline-block;
    min-width: 1.6em;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  /* a batch: the other plates fan out behind the first, after it lands */
  .cf-stack {
    position: relative;
    display: grid;
  }
  .cf-plate {
    position: absolute;
    inset: 0;
    opacity: 0.55;
    filter: saturate(0.8);
    transform: translate(calc(var(--i) * 13px), calc(var(--i) * -9px))
      scale(calc(1 - var(--i) * 0.06));
    animation: cf-plate 420ms cubic-bezier(0.2, 1.3, 0.4, 1)
      calc(380ms + var(--i) * 70ms) both;
  }
  .cf-stack[data-count='2'] .cf-plate,
  .cf-stack[data-count='3'] .cf-plate {
    opacity: 0.7;
  }
  .cf-sparkles {
    position: absolute;
    left: 50%;
    top: 100px;
  }
  .cf-sparkles i {
    position: absolute;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--glow);
    box-shadow: 0 0 8px var(--glow);
    --a: calc(var(--i) * 30deg);
    animation: cf-sparkle 900ms ease-out both;
  }
  .cf-new {
    margin: 0;
    padding: 4px 16px;
    border-radius: 999px;
    background: linear-gradient(100deg, #ffcf3a, #fff1a8 50%, #ffcf3a);
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 0.08em;
    box-shadow: 0 0 20px rgba(255, 207, 58, 0.8);
    animation: cf-pop 500ms cubic-bezier(0.3, 1.6, 0.5, 1) 700ms both;
  }
  /* the silhouette turns round into the dish */
  .reveal {
    position: relative;
    display: grid;
    width: 150px;
    height: 150px;
    perspective: 600px;
  }
  .reveal-back,
  .reveal-front {
    grid-area: 1 / 1;
    backface-visibility: hidden;
    animation: cf-flip-back 900ms cubic-bezier(0.5, 0, 0.3, 1) 300ms both;
  }
  .reveal-front {
    animation-name: cf-flip-front;
  }
  .cf-smoke {
    position: absolute;
    top: 30px;
    display: flex;
  }
  .cf-smoke i {
    width: 60px;
    height: 60px;
    margin: 0 -14px;
    border-radius: 50%;
    background: #3a3340;
    animation: cf-smoke 1200ms ease-out both;
  }
  .cf-smoke i:nth-child(2n) {
    animation-delay: 120ms;
  }
  .cf-oops {
    margin: 0;
    font-family: var(--font-display);
    font-size: 30px;
    color: #e5483b;
    transform: rotate(-8deg);
  }
  .cf-near {
    margin: 0;
    padding: 8px 12px;
    border-radius: 12px;
    background: #ffe9ef;
    font-weight: 800;
  }
  .cf-back {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin: 0;
    font-size: 13px;
  }
  .cf-back-item {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-weight: 700;
    animation: cf-bounce 600ms cubic-bezier(0.3, 1.6, 0.5, 1) 300ms both;
  }
  .result-close {
    min-height: 48px;
    min-width: 160px;
    margin-top: 6px;
    border: 3px solid #172d45;
    border-radius: 14px;
    background: #ff8fb3;
    color: #172d45;
    font: inherit;
    font-family: var(--font-display);
    font-size: 17px;
    box-shadow: 4px 4px 0 #172d45;
    cursor: pointer;
  }
  .result-close:focus-visible {
    outline: 3px solid #172d45;
    outline-offset: 3px;
  }

  @keyframes cf-in {
    from {
      opacity: 0;
    }
  }
  @keyframes cf-pulse {
    to {
      opacity: 0.85;
      transform: scale(1.08);
    }
  }
  @keyframes cf-rattle {
    25% {
      transform: rotate(-4deg) translateY(-3px);
    }
    75% {
      transform: rotate(4deg) translateY(-2px);
    }
  }
  @keyframes cf-fly {
    from {
      opacity: 0;
      transform: translateY(-40px) scale(1.4);
    }
    20% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: translate(calc((var(--i) - (var(--n) - 1) / 2) * -56px), 170px)
        scale(0.6) rotate(220deg);
    }
  }
  @keyframes cf-steam {
    from {
      opacity: 0;
      transform: translateY(14px) scaleY(0.6);
    }
    50% {
      opacity: 1;
    }
    to {
      opacity: 0;
      transform: translateY(-20px) scaleY(1.2);
    }
  }
  @keyframes cf-pop {
    from {
      opacity: 0;
      transform: scale(0.7);
    }
  }
  @keyframes cf-plate {
    from {
      opacity: 0;
      transform: none;
    }
  }
  @keyframes cf-spin-up {
    from {
      opacity: 0;
      transform: translateY(60px) rotate(-200deg) scale(0.3);
    }
  }
  @keyframes cf-sparkle {
    from {
      opacity: 1;
      transform: rotate(var(--a)) translateY(0);
    }
    to {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-110px);
    }
  }
  @keyframes cf-flip-back {
    from {
      transform: rotateY(0);
    }
    to {
      transform: rotateY(180deg);
    }
  }
  @keyframes cf-flip-front {
    from {
      transform: rotateY(-180deg);
    }
    to {
      transform: rotateY(0);
    }
  }
  @keyframes cf-smoke {
    from {
      opacity: 0.9;
      transform: scale(0.3);
    }
    to {
      opacity: 0;
      transform: translateY(-50px) scale(1.6);
    }
  }
  @keyframes cf-bounce {
    from {
      opacity: 0;
      transform: translateY(-30px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    & * {
      animation: none !important;
    }
    .reveal-back {
      display: none;
    }
  }
`
