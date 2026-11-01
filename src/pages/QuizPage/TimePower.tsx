import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { FREEZE_MS, TIME_CHARGES } from './engine/rules.mjs'
import { readFlag, saveFlag } from './quiz.mjs'
import { clock } from './Recharge'
import Watch from './Watch'

const COACHED_KEY = 'pokedex:quiz-time-coached'
const ROMAN = [
  'XII',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
]
// the last seconds of a stop blink and crack
const LATE_MS = 3000
const SHATTER_MS = 700
// the stop's seconds along the stage's top, a tick for every 2
const TICKS = 15
const TICK_MS = FREEZE_MS / TICKS

type Props = {
  left: number
  /** when the charges are full again (ms since epoch), 0 before any use */
  refillAt: number
  now: number
  disabled: boolean
  onUse: () => void
}

export default function TimePower({
  left,
  refillAt,
  now,
  disabled,
  onUse,
}: Props) {
  const [coached, setCoached] = useState(() => readFlag(COACHED_KEY))
  const resting = left <= 0
  const wait = clock(Math.max(0, refillAt - now))
  const coach = () => {
    saveFlag(COACHED_KEY)
    setCoached(true)
  }
  return (
    <TimePowerStyle className="time-power-wrap">
      <button
        type="button"
        className="time-power"
        data-left={left}
        data-resting={resting || undefined}
        disabled={disabled || resting}
        aria-keyshortcuts="T"
        aria-label={
          resting
            ? `Dialga đang nghỉ, hồi đầy sau ${wait}`
            : `Gầm Thời Gian: giữ quà ${FREEZE_MS / 1000} giây, bóng đen hiện rõ (còn ${left} lượt, phím T)`
        }
        onClick={() => {
          coach()
          onUse()
        }}
      >
        <Watch left={left} />
        <span className="time-label">{resting ? wait : 'Gầm Thời Gian'}</span>
        {!resting && <span className="time-count">{left}</span>}
      </button>
      {!coached && !resting && !disabled && (
        <p className="time-coach" role="note">
          <b>Mới: Gầm Thời Gian!</b> Giữ quà đứng yên {FREEZE_MS / 1000} giây,
          bóng đen gần như hiện nguyên hình và lộ màu. {TIME_CHARGES} lượt, hồi
          đầy sau 1 giờ. Phím T.
          <button type="button" onClick={coach}>
            Đã hiểu
          </button>
        </p>
      )}
    </TimePowerStyle>
  )
}

type FxProps = {
  /** when time runs again (performance.now) */
  until: number
  /** the stop has just been used (the clock face shows), not resumed */
  fresh: boolean
  onPhase: (phase: 'late' | 'thaw') => void
  onEnd: () => void
}

/**
 * The world holding still: a shockwave from the watch, the stage gone cold, a
 * giant clock face racing while the veil thins out and the silhouette lights,
 * 15 ticks going out one every 2 s along the stage's top (the last ones blink
 * red), then everything shatters.
 */
export function TimeStopFx({ until, fresh, onPhase, onEnd }: FxProps) {
  const [left, setLeft] = useState(() => until - performance.now())
  const phase = useRef<'hold' | 'late' | 'thaw'>('hold')
  const calls = useRef({ onPhase, onEnd })
  calls.current = { onPhase, onEnd }

  useEffect(() => {
    let timer = 0
    const step = () => {
      const rest = until - performance.now()
      setLeft(rest)
      if (rest <= LATE_MS && phase.current === 'hold') {
        phase.current = 'late'
        calls.current.onPhase('late')
      }
      if (rest <= 0) {
        phase.current = 'thaw'
        calls.current.onPhase('thaw')
        timer = window.setTimeout(() => calls.current.onEnd(), SHATTER_MS)
        return
      }
      timer = window.setTimeout(step, Math.min(250, rest))
    }
    step()
    return () => clearTimeout(timer)
  }, [until])

  const seconds = Math.max(0, Math.ceil(left / 1000))
  const ticks = Math.max(0, Math.ceil(left / TICK_MS))
  const thaw = left <= 0
  return (
    <TimeStopStyle
      className="time-stop"
      data-phase={thaw ? 'thaw' : left <= LATE_MS ? 'late' : 'hold'}
      data-fresh={fresh || undefined}
      aria-hidden="true"
    >
      <span className="ts-tint" />
      {fresh && <span className="ts-wave" />}
      {fresh && (
        <svg className="ts-face" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="92" />
          <circle cx="100" cy="100" r="78" className="ts-inner" />
          {ROMAN.map((numeral, i) => {
            const a = ((i * 30 - 90) * Math.PI) / 180
            return (
              <text
                key={numeral}
                x={100 + Math.cos(a) * 64}
                y={100 + Math.sin(a) * 64}
              >
                {numeral}
              </text>
            )
          })}
          <line className="ts-hour" x1="100" y1="100" x2="100" y2="58" />
          <line className="ts-minute" x1="100" y1="100" x2="100" y2="30" />
          <circle cx="100" cy="100" r="6" className="ts-pin" />
        </svg>
      )}
      {!thaw && (
        <span className="ts-count">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="3" y="2" width="3.5" height="12" rx="1" />
            <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
          </svg>
          {seconds}
        </span>
      )}
      <span className="ts-ticks">
        {Array.from({ length: TICKS }, (_, i) => (
          <i
            key={i}
            data-off={i >= ticks || undefined}
            data-late={(left <= LATE_MS && i < ticks) || undefined}
          />
        ))}
      </span>
      {thaw && (
        <span className="ts-shatter">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
      )}
    </TimeStopStyle>
  )
}

const TimePowerStyle = styled.div`
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 6;
  display: grid;
  justify-items: start;
  gap: 8px;
  max-width: calc(100% - 24px);

  .time-power {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px 0 8px;
    border: 1px solid rgba(160, 220, 255, 0.45);
    border-radius: 999px;
    background: rgba(5, 15, 28, 0.6);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 0 0 0 rgba(127, 211, 255, 0.6);
    transition:
      transform 160ms,
      box-shadow 300ms,
      opacity 200ms;
  }
  .time-power:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 0 18px rgba(127, 211, 255, 0.55);
  }
  .time-power:not(:disabled) {
    animation: tp-call 2.6s ease-in-out infinite;
  }
  .time-power:focus-visible {
    outline: 2px solid var(--sun);
    outline-offset: 2px;
  }
  .time-power:disabled {
    cursor: default;
    opacity: 0.72;
  }
  .time-power[data-resting] {
    opacity: 1;
    border-color: rgba(255, 255, 255, 0.18);
    font-variant-numeric: tabular-nums;
  }
  .time-power[data-resting] .gem {
    opacity: 0.35;
  }
  .watch .tick {
    stroke: rgba(255, 255, 255, 0.22);
  }
  .watch .tick[data-lit] {
    stroke: #8fe3ff;
    filter: drop-shadow(0 0 2px #8fe3ff);
  }
  .watch .hand {
    transform-origin: 20px 22px;
  }
  .time-power:active .watch .hand {
    animation: tp-whip 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .time-count {
    display: grid;
    place-items: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: #8fe3ff;
    color: var(--shadow-ink);
    font-size: 11px;
    font-weight: 800;
  }
  @media (max-width: 399px) {
    .time-power:not([data-resting]) {
      padding: 0 8px 0 8px;
    }
    .time-power:not([data-resting]) .time-label {
      display: none;
    }
  }

  .time-coach {
    position: relative;
    max-width: 250px;
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: #f4fbff;
    color: var(--ink);
    font-size: 12.5px;
    line-height: 1.4;
    box-shadow: 0 10px 24px -10px rgba(0, 0, 0, 0.6);
    animation: tp-pop 360ms cubic-bezier(0.2, 1.4, 0.4, 1) both;
  }
  .time-coach::before {
    content: '';
    position: absolute;
    left: 20px;
    top: -6px;
    width: 12px;
    height: 12px;
    background: inherit;
    transform: rotate(45deg);
  }
  .time-coach b {
    display: block;
    color: #1e5bb8;
  }
  .time-coach button {
    display: block;
    margin-top: 6px;
    min-height: 32px;
    padding: 0 12px;
    border: none;
    border-radius: 8px;
    background: var(--ink);
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  @keyframes tp-call {
    0%,
    70%,
    100% {
      box-shadow: 0 0 0 0 rgba(127, 211, 255, 0);
    }
    80% {
      box-shadow: 0 0 0 6px rgba(127, 211, 255, 0.35);
    }
  }
  @keyframes tp-whip {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes tp-pop {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.9);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .time-power,
    .time-power .watch .hand,
    .time-coach {
      animation: none !important;
    }
  }
`

const TimeStopStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;

  /* the world gone cold */
  .ts-tint {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 50% 46%,
      rgba(200, 240, 255, 0.28),
      rgba(30, 70, 150, 0.55)
    );
    /* cold, not grey: a colour blend would wash out the lit silhouette */
    mix-blend-mode: soft-light;
    animation: ts-in 200ms ease-out both;
  }
  &[data-phase='thaw'] .ts-tint {
    animation: ts-out 500ms ease-out both;
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 3px rgba(190, 235, 255, 0.75),
      inset 0 0 40px rgba(127, 211, 255, 0.45);
    animation: ts-in 200ms ease-out both;
  }
  &[data-phase='late']::after {
    animation: ts-alarm 500ms ease-in-out infinite alternate;
  }
  &[data-phase='thaw']::after {
    animation: ts-out 300ms ease-out both;
  }

  /* the shockwave from the watch */
  .ts-wave {
    position: absolute;
    left: 34px;
    top: 34px;
    width: 40px;
    height: 40px;
    margin: -20px 0 0 -20px;
    border-radius: 50%;
    border: 4px solid #d9f4ff;
    box-shadow:
      0 0 24px #7fd3ff,
      inset 0 0 18px #7fd3ff;
    animation: ts-wave 750ms cubic-bezier(0.1, 0.7, 0.3, 1) both;
  }

  /* the clock face, racing while the veil halves */
  .ts-face {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(78%, 300px);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    fill: none;
    stroke: rgba(225, 246, 255, 0.85);
    stroke-width: 2.5;
    filter: drop-shadow(0 0 8px rgba(127, 211, 255, 0.9));
    animation: ts-face 1300ms ease-out both;
  }
  .ts-face .ts-inner {
    stroke-width: 1;
    stroke-dasharray: 2 6;
  }
  .ts-face text {
    fill: rgba(235, 250, 255, 0.95);
    stroke: none;
    font-size: 15px;
    font-weight: 700;
    font-family: Georgia, 'Times New Roman', serif;
    text-anchor: middle;
    dominant-baseline: central;
  }
  .ts-face .ts-hour,
  .ts-face .ts-minute {
    stroke: #fff;
    stroke-linecap: round;
    transform-origin: 100px 100px;
  }
  .ts-face .ts-hour {
    stroke-width: 6;
    animation: ts-spin 1100ms cubic-bezier(0.3, 0, 0.2, 1) both;
    --turns: 0.75turn;
  }
  .ts-face .ts-minute {
    stroke-width: 3.5;
    animation: ts-spin 1100ms cubic-bezier(0.3, 0, 0.2, 1) both;
    --turns: 6turn;
  }
  .ts-face .ts-pin {
    fill: #fff;
  }

  /* the seconds left */
  /* along the top edge: the prize orb sits over the stage's foot */
  .ts-count {
    position: absolute;
    left: 50%;
    top: 22px;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 10px 2px 7px;
    border-radius: 999px;
    background: rgba(5, 15, 28, 0.7);
    color: #d9f4ff;
    font-size: 13px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .ts-count svg {
    width: 12px;
    height: 12px;
    fill: currentColor;
  }
  &[data-phase='late'] .ts-count {
    color: #ffb4a8;
  }
  .ts-ticks {
    position: absolute;
    left: 18px;
    right: 18px;
    top: 7px;
    display: flex;
    gap: 4px;
  }
  .ts-ticks i {
    flex: 1;
    height: 5px;
    border-radius: 3px;
    background: #bfe9ff;
    box-shadow: 0 0 6px #7fd3ff;
    transition:
      opacity 300ms,
      transform 300ms;
  }
  .ts-ticks i[data-off] {
    opacity: 0.12;
    transform: scaleY(0.5);
    box-shadow: none;
  }
  .ts-ticks i[data-late] {
    background: #ff8a78;
    box-shadow: 0 0 8px #ff5a45;
    animation: ts-blink 500ms steps(2, jump-none) infinite;
  }

  /* the crystal breaks */
  .ts-shatter {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.7),
      transparent 60%
    );
    animation: ts-out 600ms ease-out both;
  }
  .ts-shatter i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 46px;
    height: 46px;
    margin: -23px 0 0 -23px;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.95),
      rgba(127, 211, 255, 0.5)
    );
    clip-path: polygon(50% 0, 100% 70%, 20% 100%);
    --a: calc(var(--i) * 36deg);
    animation: ts-shard 650ms cubic-bezier(0.2, 0.7, 0.4, 1) both;
  }

  @keyframes ts-in {
    from {
      opacity: 0;
    }
  }
  @keyframes ts-out {
    to {
      opacity: 0;
    }
  }
  @keyframes ts-alarm {
    to {
      box-shadow:
        inset 0 0 0 3px rgba(255, 140, 120, 0.85),
        inset 0 0 40px rgba(255, 90, 69, 0.4);
    }
  }
  @keyframes ts-wave {
    from {
      opacity: 1;
      transform: scale(0.3);
    }
    to {
      opacity: 0;
      transform: scale(26);
    }
  }
  @keyframes ts-face {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(1.35) rotate(-20deg);
    }
    18%,
    75% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1) rotate(0);
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.92);
    }
  }
  @keyframes ts-spin {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(var(--turns));
    }
  }
  @keyframes ts-blink {
    50% {
      opacity: 0.25;
    }
  }
  @keyframes ts-shard {
    from {
      opacity: 1;
      transform: rotate(var(--a)) translateY(0) rotate(0) scale(1);
    }
    to {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-180%) rotate(140deg) scale(0.4);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    &::after,
    & * {
      animation: none !important;
      transition: none !important;
    }
    .ts-wave,
    .ts-face,
    .ts-shatter {
      display: none;
    }
  }
`
