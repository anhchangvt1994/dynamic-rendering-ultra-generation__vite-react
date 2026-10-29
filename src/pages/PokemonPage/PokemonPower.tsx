import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import styled from 'styled-components'
import { POWER_TIERS, getPokemonPower } from './power.mjs'

const PowerCardStyle = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  column-gap: 14px;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px 12px 12px;
  overflow: hidden;
  color: #fff;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border: 1px solid color-mix(in srgb, var(--tier-a) 35%, transparent);
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--tier-b) 40%, transparent),
    rgba(255, 255, 255, 0.07) 60%
  );

  /* light sweep across the card from tier S upward */
  &[data-radiant='true']::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      105deg,
      transparent 35%,
      color-mix(in srgb, var(--tier-a) 26%, transparent) 50%,
      transparent 65%
    );
    transform: translateX(-100%);
    animation: power-card-sweep 3.6s ease-in-out 0.8s infinite;
  }

  /* ── emblem ── */
  .power-emblem {
    position: relative;
    display: grid;
    place-items: center;
    width: 56px;
    height: 62px;
  }
  .power-halo,
  .power-rays,
  .power-sparks {
    position: absolute;
    pointer-events: none;
  }
  .power-halo {
    inset: -6px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--tier-a) 50%, transparent) 0,
      transparent 68%
    );
    opacity: 0;
  }
  &[data-glow='true'] .power-halo {
    opacity: 1;
    animation: power-halo 2.4s ease-in-out infinite alternate;
  }
  .power-rays {
    inset: -14px;
    display: none;
    border-radius: 50%;
    background: repeating-conic-gradient(
      color-mix(in srgb, var(--tier-a) 55%, transparent) 0 5deg,
      transparent 5deg 30deg
    );
    mask: radial-gradient(circle, #000 30%, transparent 70%);
    animation: power-spin 14s linear infinite;
  }
  &[data-radiant='true'] .power-rays {
    display: block;
  }
  &[data-mythic='true'] .power-rays {
    animation-duration: 7s;
  }
  &[data-ex='true'] .power-rays {
    background: repeating-conic-gradient(
      #ff5f6d 0 4deg,
      transparent 4deg 15deg,
      #ffd86f 15deg 19deg,
      transparent 19deg 30deg,
      #6bf2ff 30deg 34deg,
      transparent 34deg 45deg,
      #c77dff 45deg 49deg,
      transparent 49deg 60deg
    );
  }
  .power-hex,
  .power-core {
    display: grid;
    place-items: center;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  }
  .power-hex {
    position: relative;
    width: 52px;
    height: 58px;
    overflow: hidden;
    background: linear-gradient(160deg, var(--tier-a), var(--tier-b));
    animation: power-stamp 640ms cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  &[data-ex='true'] .power-hex::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: conic-gradient(
      #ff5f6d,
      #ffd86f,
      #7dff9b,
      #6bf2ff,
      #7c8bff,
      #ff7ce8,
      #ff5f6d
    );
    animation: power-spin 3s linear infinite;
  }
  .power-core {
    position: relative;
    width: 44px;
    height: 50px;
    overflow: hidden;
    background: radial-gradient(
      circle at 50% 28%,
      color-mix(in srgb, var(--tier-b) 75%, #000) 0,
      #0a0d13 92%
    );
  }
  .power-core b {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.05em;
    line-height: 1;
    color: var(--tier-a);
  }
  &[data-rank='SSS'] .power-core b {
    font-size: 14px;
  }
  &[data-glow='true'] .power-core b {
    text-shadow:
      0 0 6px var(--tier-a),
      0 0 14px var(--tier-b);
  }
  &[data-ex='true'] .power-core b {
    background: linear-gradient(120deg, #ffd86f, #ff7ce8, #6bf2ff);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    text-shadow: none;
  }
  &[data-radiant='true'] .power-core::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      115deg,
      transparent 40%,
      rgba(255, 255, 255, 0.5) 50%,
      transparent 60%
    );
    transform: translateX(-120%);
    animation: power-glint 2.8s ease-in-out 0.7s infinite;
  }
  &[data-level='0'] .power-hex,
  &[data-level='1'] .power-hex {
    filter: saturate(0.5) brightness(0.85);
  }
  .power-sparks {
    inset: 0;
    animation: power-spin 6s linear infinite;
  }
  .power-sparks i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    margin: -2px;
    border-radius: 50%;
    background: #fff;
    box-shadow:
      0 0 5px 2px var(--tier-a),
      0 0 10px 3px var(--tier-b);
    transform: rotate(calc(var(--i) * 60deg)) translateY(-34px);
    animation: power-twinkle 1.6s ease-in-out calc(var(--i) * -0.27s) infinite;
  }

  /* ── reading: total + strength icon, then the ladder ── */
  .power-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .power-icon {
    width: 26px;
    height: 26px;
    color: var(--tier-a);
    fill: currentColor;
  }
  &[data-glow='true'] .power-icon {
    filter: drop-shadow(0 0 5px var(--tier-a));
  }
  .power-icon[data-icon='battery-low'] .power-icon-fill {
    animation: power-low 1.6s steps(1, end) infinite;
  }
  .power-icon[data-icon='bolt'] {
    animation: power-bolt 2.4s ease-in-out infinite;
  }
  .power-icon[data-icon='flame'] {
    transform-origin: 50% 90%;
    animation: power-flame 0.7s ease-in-out infinite alternate;
  }
  .power-icon[data-icon='crown'] {
    animation: power-crown 2.2s ease-in-out infinite alternate;
  }
  .power-bst {
    flex: none;
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .power-bst small {
    margin-left: 5px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0;
    opacity: 0.75;
  }

  /*
   * Ten rising bars, F → EX, like a signal-strength meter. Filled bars all
   * use the current tier's colour (rising in intensity), so the ladder
   * answers one question only: how far up the scale this Pokémon reaches.
   */
  .power-ladder {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    align-items: end;
    height: 20px;
    margin-top: 8px;
  }
  .power-seg {
    position: relative;
    height: calc(6px + var(--i) * 1.55px);
    overflow: hidden;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.09);
    transform: skewX(-16deg);
  }
  .power-seg i {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--fill);
    background: linear-gradient(90deg, var(--tier-b), var(--tier-a));
    box-shadow: 0 0 8px var(--tier-a);
    opacity: calc(0.45 + var(--i) * 0.06);
    transform-origin: left;
    animation: power-charge 320ms ease-out calc(var(--i) * 70ms) both;
  }
  .power-seg[data-state='current'] {
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--tier-a) 70%, transparent);
  }
  /* EX: one continuous holo sweep across the whole ladder */
  &[data-ex='true'] .power-seg i {
    background: linear-gradient(
        90deg,
        #ff5f6d,
        #ffd86f,
        #7dff9b,
        #6bf2ff,
        #c77dff,
        #ff7ce8
      )
      calc(var(--i) * 11.1%) 0 / 1000% 100%;
    box-shadow: none;
    opacity: 1;
  }
  .power-seg[data-state='current'] i {
    animation:
      power-charge 320ms ease-out calc(var(--i) * 70ms) both,
      power-pulse 1.3s ease-in-out calc(var(--i) * 70ms + 320ms) infinite
        alternate;
  }

  @keyframes power-low {
    50% {
      opacity: 0.2;
    }
  }
  @keyframes power-bolt {
    0%,
    70%,
    100% {
      opacity: 0.8;
    }
    75%,
    85% {
      opacity: 1;
      filter: drop-shadow(0 0 8px var(--tier-a));
    }
    80% {
      opacity: 0.4;
    }
  }
  @keyframes power-flame {
    from {
      transform: scale(0.94, 0.9) rotate(-3deg);
    }
    to {
      transform: scale(1.04, 1.08) rotate(3deg);
    }
  }
  @keyframes power-crown {
    from {
      transform: translateY(1px);
      filter: drop-shadow(0 0 3px var(--tier-a));
    }
    to {
      transform: translateY(-2px);
      filter: drop-shadow(0 0 9px var(--tier-a));
    }
  }
  @keyframes power-stamp {
    from {
      transform: scale(1.8) rotate(-12deg);
      opacity: 0;
    }
    to {
      transform: scale(1) rotate(0);
      opacity: 1;
    }
  }
  @keyframes power-halo {
    from {
      transform: scale(0.85);
      opacity: 0.55;
    }
    to {
      transform: scale(1.12);
      opacity: 1;
    }
  }
  @keyframes power-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes power-glint {
    0% {
      transform: translateX(-120%);
    }
    45%,
    100% {
      transform: translateX(120%);
    }
  }
  @keyframes power-card-sweep {
    0% {
      transform: translateX(-100%);
    }
    40%,
    100% {
      transform: translateX(100%);
    }
  }
  @keyframes power-twinkle {
    0%,
    100% {
      opacity: 0.2;
      scale: 0.6;
    }
    50% {
      opacity: 1;
      scale: 1.2;
    }
  }
  @keyframes power-charge {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
  @keyframes power-pulse {
    from {
      filter: brightness(0.85);
    }
    to {
      filter: brightness(1.35);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    & * {
      animation: none !important;
    }
    &::after,
    .power-core::after {
      display: none;
    }
  }
`

// One glanceable icon per strength band instead of a text label:
// F/E low battery, D/C half battery, B/A bolt, S/SS flame, SSS/EX crown.
const ICONS = [
  'battery-low',
  'battery-low',
  'battery-mid',
  'battery-mid',
  'bolt',
  'bolt',
  'flame',
  'flame',
  'crown',
  'crown',
] as const

function PowerIcon({ level }: { level: number }) {
  const icon = ICONS[level]
  const battery = icon === 'battery-low' || icon === 'battery-mid'
  return (
    <svg className="power-icon" data-icon={icon} viewBox="0 0 24 24">
      {battery && (
        <>
          <rect
            x="2"
            y="7"
            width="18"
            height="10"
            rx="2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <rect x="21" y="10" width="2" height="4" rx="1" />
          <rect
            className="power-icon-fill"
            x="4.5"
            y="9.5"
            width={icon === 'battery-low' ? 3 : 7.5}
            height="5"
            rx="1"
          />
        </>
      )}
      {icon === 'bolt' && <path d="M13.5 2L4 14h7l-1.5 8L20 10h-7l.5-8z" />}
      {icon === 'flame' && (
        <path d="M12 2c.8 3.6 6 5.8 6 12a6 6 0 0 1-12 0c0-2.9 1.7-4.9 3-6.6.2 1.9 1 3 2.3 3.3C11 7.6 10.6 5 12 2z" />
      )}
      {icon === 'crown' && (
        <>
          <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 9H4.6z" />
          <rect x="4.6" y="18.5" width="14.8" height="2.2" rx="1" />
        </>
      )}
    </svg>
  )
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Counts from the previously shown value, so switching Pokémon visibly
// "charges up" or "drains" to the new total instead of jumping.
function useCountUp(target: number) {
  const [value, setValue] = useState(target)
  const shown = useRef(0)
  useEffect(() => {
    if (reducedMotion()) {
      shown.current = target
      setValue(target)
      return
    }
    const origin = shown.current
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      shown.current = Math.round(
        origin + (target - origin) * (1 - (1 - t) ** 3)
      )
      setValue(shown.current)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value
}

const PokemonPower = memo(({ stats }: { stats: any[] }) => {
  const power = getPokemonPower(stats)
  const bst = useCountUp(power.bst)
  if (!stats.length) return null
  const { level, rank, label, color, progress } = power

  return (
    <PowerCardStyle
      aria-label={`Sức mạnh: hạng ${rank}, ${label}, tổng chỉ số ${power.bst}`}
      title={`Hạng ${rank} · ${label}`}
      data-rank={rank}
      data-level={level}
      data-glow={level >= 4}
      data-radiant={level >= 6}
      data-mythic={level >= 8}
      data-ex={level === 9}
      style={{ '--tier-a': color.a, '--tier-b': color.b } as CSSProperties}
    >
      <div className="power-emblem" aria-hidden="true">
        <span className="power-rays" />
        <span className="power-halo" />
        <span key={rank} className="power-hex">
          <span className="power-core">
            <b>{rank}</b>
          </span>
        </span>
        {level >= 8 && (
          <span className="power-sparks">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </span>
        )}
      </div>

      <div aria-hidden="true">
        <div className="power-head">
          <span className="power-bst">
            {bst}
            <small>BST</small>
          </span>
          <PowerIcon level={level} />
        </div>
        <div key={power.bst} className="power-ladder">
          {POWER_TIERS.map((step, i) => (
            <span
              key={step.rank}
              className="power-seg"
              data-state={
                i < level ? 'full' : i === level ? 'current' : 'empty'
              }
              style={
                {
                  '--i': i,
                  '--fill':
                    i < level
                      ? '100%'
                      : i === level
                        ? `${Math.max(14, progress * 100)}%`
                        : '0%',
                } as CSSProperties
              }
            >
              <i />
            </span>
          ))}
        </div>
      </div>
    </PowerCardStyle>
  )
})

PokemonPower.displayName = 'PokemonPower'
export default PokemonPower
