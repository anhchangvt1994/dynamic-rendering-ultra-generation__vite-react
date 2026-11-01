import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { TIERS, itemById, itemSprite } from './items.mjs'
import { TURNS, WINDOW_MS } from './progress.mjs'
import QuickLinks from './QuickLinks'

type Props = {
  /** when the turns come back */
  refill: number
  now: number
  onPlay: () => void
}

export const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const SNORLAX = 143
// what Snorlax mumbles when poked
const MUMBLES = [
  'Zzz… thêm 5 phút nữa…',
  'Grừ… đừng đánh thức…',
  'Zzz… Rare Candy… ngon quá…',
  'Hừm… chưa tới giờ mà…',
]

/*
 * Out of turns: a Snorlax asleep across the road, the games' own way of
 * saying "not yet". A night sky with its stars and moon, the clock to when
 * it wakes; the sky lightens toward dawn as the time runs (--p), and a
 * moon-to-sun track crosses the bottom. A tap makes it mumble. When the
 * time is up the sun is out, Snorlax jumps up and the game goes on.
 */
const RechargeStyle = styled.div`
  /* over the page's .stage rules: a sky, not the sunburst */
  &&& {
    --sky-top: color-mix(in srgb, #3f7fe0 calc(var(--p) * 70%), #070b26);
    --sky-low: color-mix(in srgb, #ff9f5a calc(var(--p) * 80%), #2a1b5e);
    display: block;
    height: var(--stage-h);
    padding: 0;
    background: linear-gradient(var(--sky-top), var(--sky-low));
    animation: none;
  }
  &&&[data-ready] {
    --sky-top: #48b6ff;
    --sky-low: #ffe2a0;
  }
  &&& .burst {
    opacity: 0;
    transition: opacity 1.2s ease-out;
  }
  &&& .burst::after {
    display: none;
  }
  &&&[data-ready] .burst {
    opacity: 0.6;
  }

  /* the stars fade as dawn comes */
  .sky-stars {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(1.5px 1.5px at 12% 18%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 26% 40%, #fff 50%, transparent 51%),
      radial-gradient(2px 2px at 38% 12%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 55% 30%, #fff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 68% 9%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 82% 34%, #fff 50%, transparent 51%),
      radial-gradient(2px 2px at 91% 16%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 8% 52%, #fff 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 47% 48%, #fff 50%, transparent 51%),
      radial-gradient(1px 1px at 76% 55%, #fff 50%, transparent 51%);
    opacity: calc(1 - var(--p) * 0.9);
    animation: sky-twinkle 3s ease-in-out infinite alternate;
  }
  .sky-stars + .sky-stars {
    transform: translate(7%, 9%) scale(-1, 1);
    animation-delay: -1.5s;
  }
  &[data-ready] .sky-stars {
    opacity: 0;
  }
  /* the moon, a sun once it is time */
  .sky-moon {
    position: absolute;
    right: 7%;
    top: 40%;
    width: clamp(30px, 10cqw, 52px);
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow: inset clamp(8px, 2.6cqw, 14px)
      calc(clamp(8px, 2.6cqw, 14px) * -0.4) 0 0 #fff3c4;
    filter: drop-shadow(0 0 12px rgba(255, 243, 196, 0.7));
    transition:
      background-color 1s ease-out,
      box-shadow 1s ease-out;
  }
  &[data-ready] .sky-moon {
    background: #ffd54a;
    box-shadow:
      0 0 0 8px rgba(255, 213, 74, 0.25),
      0 0 40px 10px rgba(255, 200, 60, 0.6);
    animation: sky-sun 900ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }
  /* the hill it sleeps on */
  .sky-hill {
    position: absolute;
    left: -20%;
    right: -20%;
    bottom: -46%;
    height: 72%;
    border-radius: 50%;
    background: radial-gradient(
      ellipse at 50% 20%,
      color-mix(in srgb, #4fae5a calc(var(--p) * 100%), #173826),
      color-mix(in srgb, #2b7a3c calc(var(--p) * 100%), #0b1f16) 70%
    );
  }
  &[data-ready] .sky-hill {
    background: radial-gradient(ellipse at 50% 20%, #6fd36f, #2f8a3f 70%);
  }

  /* the clock at the top */
  .wake {
    position: relative;
    z-index: 2;
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 16px 16px 0;
    text-align: center;
  }
  .wake-kicker {
    margin: 0;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(5, 10, 30, 0.6);
    box-shadow: inset 0 0 0 1.5px rgba(255, 243, 196, 0.35);
    white-space: nowrap;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #fff3c4;
  }
  &[data-ready] .wake-kicker {
    background: var(--win);
    box-shadow: none;
    color: #fff;
    animation: sky-pop 480ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  .wake-clock {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(36px, 12cqw, 64px);
    line-height: 1 !important;
    font-variant-numeric: tabular-nums;
    color: var(--sun);
    -webkit-text-stroke: 1.5px #241a52;
    paint-order: stroke fill;
    text-shadow:
      0 4px 0 #241a52,
      0 0 26px rgba(255, 218, 85, 0.45);
  }
  .wake-at {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.82);
  }
  .wake-at b {
    color: #fff;
  }
  .wake-play {
    width: auto;
    min-width: 200px;
    margin-top: 6px;
    background: var(--sun);
    color: var(--ink);
    animation: sky-pop 480ms cubic-bezier(0.3, 1.6, 0.5, 1) 900ms both;
  }

  /* Snorlax, breathing; a tap makes it mumble */
  .snorlax {
    position: absolute;
    left: 50%;
    bottom: 26px;
    z-index: 1;
    width: min(54%, calc(var(--stage-h) * 0.58));
    aspect-ratio: 1;
    padding: 0;
    border: none;
    background: none;
    translate: -50% 0;
    cursor: pointer;
  }
  .snorlax img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform-origin: 50% 100%;
    filter: brightness(calc(0.6 + var(--p) * 0.35)) saturate(0.85)
      drop-shadow(0 10px 12px rgba(0, 0, 0, 0.4));
    animation: sky-breathe 3.4s ease-in-out infinite;
  }
  .snorlax[data-poked] img {
    animation: sky-poke 600ms ease-in-out;
  }
  &[data-ready] .snorlax img {
    filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.3));
    animation: sky-wake 900ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
  }
  .snorlax:focus-visible {
    outline: 3px solid var(--sun);
    outline-offset: 4px;
    border-radius: 20px;
  }
  /* Z, z, z, rising */
  .zzz {
    position: absolute;
    left: 62%;
    top: 4%;
    pointer-events: none;
  }
  .zzz i {
    position: absolute;
    left: 0;
    top: 0;
    font-family: var(--font-display);
    font-style: normal;
    color: #fff3c4;
    text-shadow: 0 2px 0 #241a52;
    opacity: 0;
    animation: sky-z 3s ease-out infinite;
  }
  .zzz i:nth-child(1) {
    font-size: 14px;
  }
  .zzz i:nth-child(2) {
    font-size: 19px;
    animation-delay: 1s;
  }
  .zzz i:nth-child(3) {
    font-size: 25px;
    animation-delay: 2s;
  }
  &[data-ready] .zzz {
    display: none;
  }
  .bubble {
    position: absolute;
    left: 50%;
    bottom: 92%;
    z-index: 3;
    padding: 6px 12px;
    border-radius: 14px;
    background: #fff;
    color: var(--ink);
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    translate: -50% 0;
    box-shadow: 3px 3px 0 var(--shadow-ink);
    animation: sky-pop 360ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  .bubble::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 100%;
    margin-left: -6px;
    border: 6px solid transparent;
    border-top-color: #fff;
  }
  /* awake: a "!" pops beside its head */
  &[data-ready] .bubble {
    left: 86%;
    bottom: 58%;
    padding: 2px 12px 4px;
    font-family: var(--font-display);
    font-size: 26px;
    color: var(--lose);
  }
  &[data-ready] .bubble::after {
    left: 6px;
    top: auto;
    bottom: -8px;
    border-top-color: #fff;
    rotate: 30deg;
  }

  /* night to day, along the bottom */
  .sky-track {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 11px;
    z-index: 2;
    height: 6px;
    border-radius: 999px;
    background: rgba(5, 10, 30, 0.45);
  }
  .sky-track i {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: calc(var(--p) * 100%);
    border-radius: inherit;
    background: linear-gradient(90deg, #8f9bff, #ffd54a);
    transition: width 1s linear;
  }
  .sky-track i::after {
    content: '';
    position: absolute;
    right: -7px;
    top: 50%;
    width: 14px;
    height: 14px;
    margin-top: -7px;
    border-radius: 50%;
    background: #fff3c4;
    box-shadow: 0 0 10px #ffd54a;
  }

  @keyframes sky-twinkle {
    to {
      filter: brightness(0.5);
    }
  }
  @keyframes sky-breathe {
    50% {
      scale: 1.025 1.045;
    }
  }
  @keyframes sky-poke {
    25% {
      rotate: -4deg;
    }
    60% {
      rotate: 3deg;
    }
  }
  @keyframes sky-wake {
    0% {
      scale: 1;
    }
    30% {
      scale: 1.12 0.85;
    }
    60% {
      translate: 0 -18%;
      scale: 0.95 1.08;
    }
    100% {
      translate: 0 0;
      scale: 1;
    }
  }
  @keyframes sky-z {
    0% {
      opacity: 0;
      transform: translate(0, 0) rotate(-10deg);
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(26px, -46px) rotate(12deg);
    }
  }
  @keyframes sky-sun {
    from {
      transform: translateY(40px) scale(0.4);
    }
  }
  @keyframes sky-pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`

export default function Recharge({ refill, now, onPlay }: Props) {
  const left = refill - now
  const ready = left <= 0
  const progress = Math.min(1, Math.max(0, 1 - left / WINDOW_MS))
  const at = new Date(refill).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const [mumble, setMumble] = useState('')
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  const poke = () => {
    if (ready) return
    setMumble(MUMBLES[Math.floor(Math.random() * MUMBLES.length)])
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMumble(''), 1800)
  }

  return (
    <RechargeStyle
      className="stage recharge"
      data-ready={ready || undefined}
      style={{ '--p': progress } as CSSProperties}
    >
      <span className="burst" aria-hidden="true" />
      <span className="sky-stars" aria-hidden="true" />
      <span className="sky-stars" aria-hidden="true" />
      <span className="sky-moon" aria-hidden="true" />
      <span className="sky-hill" aria-hidden="true" />
      <div className="wake">
        <p className="wake-kicker">
          {ready ? 'Snorlax đã dậy!' : 'Hết lượt · Snorlax đang ngủ'}
        </p>
        {ready ? (
          <>
            <p className="wake-at" role="status">
              Đủ {TURNS} lượt rồi. Bóng đen tiếp theo đang chờ bạn!
            </p>
            <button type="button" className="next wake-play" onClick={onPlay}>
              Chơi tiếp ►
            </button>
          </>
        ) : (
          <>
            <p className="wake-clock">
              <span className="sr-only">Có lượt mới sau </span>
              {clock(left)}
            </p>
            <p className="wake-at">
              Dậy lúc <b>{at}</b> · {TURNS} lượt mới
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        className="snorlax"
        data-poked={mumble || undefined}
        onClick={poke}
        aria-label={ready ? 'Snorlax đã dậy' : 'Snorlax đang ngủ (chạm thử)'}
      >
        <img
          src={getPokemonImage(SNORLAX)}
          alt=""
          width={280}
          height={280}
          draggable={false}
        />
        {!ready && (
          <span className="zzz" aria-hidden="true">
            <i>z</i>
            <i>z</i>
            <i>Z</i>
          </span>
        )}
        {(mumble || ready) && (
          <span key={mumble || 'ready'} className="bubble" role="status">
            {ready ? '!' : mumble}
          </span>
        )}
      </button>
      {!ready && (
        <span className="sky-track" aria-hidden="true">
          <i />
        </span>
      )}
    </RechargeStyle>
  )
}

type RecapProps = {
  wins: number
  /** rounds played: the window's turns, bonus turns included */
  played: number
  /** bonus turns won in the window */
  bonus: number
  gifts: string[]
  bagCount: number
  onPick: (id: string) => void
}

/*
 * While Snorlax sleeps: what the window just paid, gifts to tap, and the
 * bag and the collection to go and look at.
 */
const RecapStyle = styled.section`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 3px solid var(--shadow-ink);
  border-radius: 22px;
  background: linear-gradient(
    160deg,
    rgba(122, 90, 220, 0.3),
    rgba(5, 15, 28, 0.75) 65%
  );
  box-shadow: 5px 5px 0 var(--shadow-ink);

  .recap-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .recap-text {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .recap-title {
    margin: 0;
    white-space: nowrap;
    font-family: var(--font-display);
    font-size: 19px;
    line-height: 1 !important;
    text-transform: uppercase;
    color: #fff;
  }
  .recap-score {
    margin: 0;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.8);
  }
  .recap-bonus {
    margin: 0;
    font-size: 11px;
    font-weight: 800;
    color: #ff9d8f;
  }
  .recap-score b {
    font-family: var(--font-display);
    font-size: 20px;
    color: var(--sun);
  }
  .recap-gifts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .recap-gifts button {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    padding: 0;
    border: none;
    border-radius: 14px;
    background:
      radial-gradient(
        circle,
        color-mix(in srgb, var(--tier) 40%, transparent),
        transparent 70%
      ),
      rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 2px var(--tier);
    cursor: pointer;
    animation: sky-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1)
      calc(var(--i) * 60ms) both;
  }
  .recap-gifts img {
    width: 36px;
    height: 36px;
    image-rendering: pixelated;
  }
  .recap-empty {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
  }
  @keyframes sky-pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
    }
  }
`

export function Recap({
  wins,
  played,
  bonus,
  gifts,
  bagCount,
  onPick,
}: RecapProps) {
  return (
    <RecapStyle className="recap" aria-labelledby="quiz-recap">
      <div className="recap-head">
        <div className="recap-text">
          <h2 id="quiz-recap" className="recap-title">
            Tổng kết
          </h2>
          <p className="recap-score">
            Đúng <b>{wins}</b>/{played} câu
          </p>
          {bonus > 0 && (
            <p className="recap-bonus">
              {TURNS} lượt + {bonus} lượt thưởng
            </p>
          )}
        </div>
        <QuickLinks bagCount={bagCount} />
      </div>
      {gifts.length ? (
        <ul className="recap-gifts" aria-label="Quà đã nhận">
          {gifts.map((id, index) => {
            const item = itemById(id)
            return (
              <li key={`${id}-${index}`}>
                <button
                  type="button"
                  onClick={() => onPick(id)}
                  aria-label={item.name}
                  style={
                    {
                      '--tier': TIERS[item.tier].color,
                      '--i': index,
                    } as CSSProperties
                  }
                >
                  <img src={itemSprite(id)} alt="" width={30} height={30} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="recap-empty">
          Chưa có quà nào. Lần tới đoán sớm hơn để giữ được quà quý!
        </p>
      )}
    </RecapStyle>
  )
}
