import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { TIERS, isValuable, itemById, itemSprite } from './items.mjs'
import { dialogCss, useModal } from './useModal'
import { COMBO_AT, SPECIAL_AT } from './progress.mjs'

import type { QuizEngine } from './engine/types'
import { useChestShards } from './shards/useChestShards'
import catalog from './shards/catalog.json'
import { isRare } from './shards/chestRewards.mjs'
import { quizLabel } from './quiz.mjs'
import { getPokemonSprite } from 'pages/PokemonPage/navigation.mjs'

const speciesOf = (id: number) => catalog.species.find((e) => e.id === id)

export type Chest = {
  kind: 'combo' | 'special'
  gifts: string[]
  /** the round that won it: what opening it takes off the list */
  round: string
  /** set when the chest also carries shards (not on legacy rounds) */
  roundId?: string
}

type Props = {
  engine: QuizEngine | null
  chests: Chest[]
  open: boolean
  onPick: (id: string) => void
  onClose: () => void
}

const COPY = {
  combo: {
    kicker: `Chuỗi ${COMBO_AT}!`,
    title: 'Premier Ball quà tặng',
    hint: 'Chạm vào quả bóng để mở',
  },
  special: {
    kicker: `${SPECIAL_AT} kỷ lục!`,
    title: 'Master Ball đặc biệt',
    hint: 'Phần thưởng lớn nhất. Chạm để mở!',
  },
}
const OPEN_MS = 1500

/*
 * A streak's chest is a ball to break open: the Premier Ball the games give
 * as a bonus for a streak of 10, the Master Ball for 10 records. It shakes,
 * its lid flies up in a burst of light and the gifts fly out as cards that
 * turn over one by one, the rare ones in foil.
 */
const ChestStyle = styled.dialog`
  ${dialogCss}
  --dialog-w: 620px;

  .scene::-webkit-scrollbar {
    display: none;
  }
  .scene {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 10px;
    max-height: calc(100svh - 24px);
    overflow: hidden auto;
    scrollbar-width: none;
    padding: 26px 16px 20px;
    border-radius: 30px;
    background:
      radial-gradient(90% 60% at 50% 30%, var(--glow) 0, transparent 70%),
      #081428;
    box-shadow:
      inset 0 0 0 2px var(--edge),
      0 30px 90px -20px var(--glow);
    isolation: isolate;
    text-align: center;
  }
  &[data-kind='combo'] {
    --glow: rgba(255, 207, 58, 0.32);
    --edge: rgba(255, 207, 58, 0.55);
    --accent: #ffcf3a;
  }
  &[data-kind='special'] {
    --glow: rgba(183, 124, 255, 0.45);
    --edge: rgba(224, 79, 155, 0.7);
    --accent: #e9a6ff;
  }
  .rays {
    position: absolute;
    inset: -40%;
    z-index: -1;
    background: repeating-conic-gradient(
      from 0deg at 50% 38%,
      color-mix(in srgb, var(--accent) 22%, transparent) 0 6deg,
      transparent 6deg 16deg
    );
    -webkit-mask: radial-gradient(circle at 50% 38%, #000 8%, transparent 52%);
    mask: radial-gradient(circle at 50% 38%, #000 8%, transparent 52%);
    animation: chest-spin 30s linear infinite;
  }
  .kicker {
    margin: 0;
    padding: 4px 14px;
    border-radius: 999px;
    background: var(--accent);
    color: #0b1830;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    animation: chest-kick 600ms cubic-bezier(0.3, 1.6, 0.5, 1) both;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(26px, 7vw, 38px);
    line-height: 1.05 !important;
    text-transform: uppercase;
    color: #fff;
    text-shadow:
      0 4px 0 color-mix(in srgb, var(--accent) 45%, #000),
      0 0 30px var(--glow);
  }
  .hint {
    margin: 0;
    min-height: 22px;
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.75);
  }

  /* the ball */
  .orb {
    position: relative;
    display: grid;
    place-items: center;
    width: min(56vw, 220px);
    aspect-ratio: 1;
    margin: 10px 0 6px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    animation: chest-bob 1.8s ease-in-out infinite;
  }
  .orb svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.5))
      drop-shadow(0 0 26px var(--glow));
  }
  .lid {
    transform-box: fill-box;
    transform-origin: 0% 100%;
  }
  .orb-light {
    position: absolute;
    inset: -30%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      #fff 0 10%,
      var(--accent) 26%,
      transparent 60%
    );
    opacity: 0;
    pointer-events: none;
  }
  &[data-phase='opening'] .orb {
    animation: chest-shake ${OPEN_MS}ms ease-in-out both;
    cursor: default;
  }
  &[data-phase='opening'] .lid {
    animation: chest-lid 420ms cubic-bezier(0.3, 1.4, 0.5, 1) ${OPEN_MS - 420}ms
      both;
  }
  &[data-phase='opening'] .orb-light {
    animation: chest-light 600ms ease-out ${OPEN_MS - 380}ms both;
  }
  .ring {
    position: absolute;
    left: 50%;
    top: 38%;
    width: 80px;
    aspect-ratio: 1;
    margin: -40px 0 0 -40px;
    border: 4px solid var(--accent);
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }
  &[data-phase='open'] .ring {
    animation: chest-ring 800ms cubic-bezier(0.1, 0.8, 0.3, 1) both;
  }

  /* the cards */
  .cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    width: 100%;
    margin: 8px 0 4px;
    padding: 0;
    list-style: none;
    perspective: 900px;
  }
  .cards li {
    width: calc((100% - 20px) / 3);
    max-width: 104px;
  }
  &[data-kind='special'] .cards li {
    max-width: 96px;
  }
  .gift {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    padding: 0;
    border: none;
    background: none;
    color: #fff;
    font: inherit;
    cursor: pointer;
    animation: chest-fly 560ms cubic-bezier(0.2, 1.2, 0.4, 1)
      calc(var(--i) * 90ms) both;
  }
  .gift-inner {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    transform-style: preserve-3d;
    animation: chest-flip 620ms cubic-bezier(0.3, 1.3, 0.5, 1)
      calc(420ms + var(--i) * 150ms) both;
  }
  .gift-back,
  .gift-front {
    position: absolute;
    inset: 0;
    border-radius: 16px;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
  }
  .gift-back {
    transform: rotateY(180deg);
    background:
      radial-gradient(
        circle,
        transparent 28%,
        #14161a 29% 34%,
        transparent 35%
      ),
      linear-gradient(#e5483b 0 47%, #14161a 47% 53%, #f4f4f4 53%);
    box-shadow:
      inset 0 0 0 3px #14161a,
      inset 0 0 0 6px var(--accent);
  }
  .gift-front {
    display: grid;
    grid-template-rows: auto 1fr auto;
    justify-items: center;
    padding: 8px 6px 10px;
    overflow: hidden;
    background:
      radial-gradient(
        circle at 50% 45%,
        color-mix(in srgb, var(--tier) 45%, transparent),
        transparent 62%
      ),
      #0d1d38;
    box-shadow:
      inset 0 0 0 2px var(--tier),
      0 10px 24px -10px var(--tier);
  }
  /* the foil: a slanted sheen crosses the card edge to edge, then rests */
  .gift[data-valuable] .gift-front::after {
    content: '';
    position: absolute;
    top: -20%;
    bottom: -20%;
    left: 0;
    width: 60%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.38) 42%,
      color-mix(in srgb, var(--tier) 40%, transparent) 55%,
      transparent
    );
    mix-blend-mode: screen;
    transform: translateX(-130%) skewX(-16deg);
    animation: chest-foil 3.2s cubic-bezier(0.45, 0.05, 0.35, 1)
      calc(1s + var(--i) * 150ms) infinite;
  }
  .gift-front .stars {
    color: var(--tier);
    font-size: 10px;
    letter-spacing: 1px;
    text-shadow: 0 0 8px var(--tier);
  }
  .gift-front img {
    align-self: center;
    width: 64%;
    height: auto;
    image-rendering: pixelated;
    filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.35));
  }
  .gift-front .name {
    font-size: 11px;
    font-weight: 800;
    line-height: 1.2;
  }
  .gift:hover .gift-front {
    box-shadow:
      inset 0 0 0 2px var(--tier),
      0 0 24px var(--tier);
  }

  .collect {
    min-height: 54px;
    margin-top: 8px;
    padding: 0 28px;
    border: 3px solid #050f1c;
    border-radius: 16px;
    background: var(--accent);
    color: #0b1830;
    font: inherit;
    font-family: var(--font-display);
    font-size: 17px;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 #050f1c;
    cursor: pointer;
    animation: chest-kick 400ms cubic-bezier(0.3, 1.6, 0.5, 1) 1.2s both;
  }
  .collect:active {
    translate: 3px 3px;
    box-shadow: 1px 1px 0 #050f1c;
  }

  /* the chest's amber shards: a strip under the item cards */
  .chest-shards {
    display: grid;
    justify-items: center;
    gap: 8px;
    width: 100%;
    max-width: 440px;
    padding: 12px 12px 14px;
    border-radius: 20px;
    background: linear-gradient(100deg, #3a2406 0, #0b1830 75%);
    box-shadow: inset 0 0 0 2px #ffc24a80;
    color: #fff;
    animation: chest-kick 400ms cubic-bezier(0.3, 1.6, 0.5, 1) 1s both;
  }
  .chest-shards h3 {
    margin: 0;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #ffc24a;
  }
  .chest-shards ul {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .chest-shards li {
    position: relative;
    display: grid;
    justify-items: center;
    width: 96px;
    padding: 6px 4px 8px;
    border-radius: 14px;
    background:
      radial-gradient(circle at 50% 38%, #ffcf6a66, transparent 70%), #1a2a48;
    box-shadow: inset 0 0 0 1px #ffe3a855;
  }
  .chest-shards li[data-rare] {
    box-shadow:
      inset 0 0 0 2px #e9a6ff,
      0 0 18px -4px #b77cff;
  }
  .chest-shards img {
    width: 56px;
    height: 56px;
    image-rendering: pixelated;
  }
  .chest-shards .rare {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: 1px 6px;
    border-radius: 999px;
    background: #e9a6ff;
    color: #2a0b40;
    font-size: 10px;
    font-weight: 900;
  }
  .chest-shards .who {
    max-width: 100%;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.2;
    overflow-wrap: anywhere;
    text-align: center;
  }
  .chest-shards .many {
    font-size: 13px;
    color: #ffe08a;
    font-weight: 800;
  }
  .chest-shards p {
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.82);
  }
  .chest-shards button {
    min-height: 40px;
    padding: 0 16px;
    border: 2px solid #ffc24a;
    border-radius: 12px;
    background: transparent;
    color: #ffe08a;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  .chest-shards button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .chest-shards {
      animation: none;
    }
  }

  @media (min-width: 640px) {
    .cards li {
      width: calc((100% - 40px) / 5);
    }
  }

  @keyframes chest-spin {
    to {
      rotate: 360deg;
    }
  }
  @keyframes chest-kick {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @keyframes chest-bob {
    50% {
      translate: 0 -8px;
      rotate: -3deg;
    }
  }
  @keyframes chest-shake {
    0%,
    20%,
    40%,
    60%,
    100% {
      rotate: 0deg;
    }
    8% {
      rotate: -14deg;
    }
    30% {
      rotate: 14deg;
    }
    50% {
      rotate: -18deg;
    }
    70% {
      rotate: 0deg;
      scale: 1;
    }
    85% {
      scale: 1.12;
    }
  }
  @keyframes chest-lid {
    to {
      transform: translate(-6%, -30%) rotate(-125deg);
    }
  }
  @keyframes chest-light {
    0% {
      opacity: 0;
      scale: 0.3;
    }
    40% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      scale: 2.6;
    }
  }
  @keyframes chest-ring {
    0% {
      opacity: 1;
      scale: 0.3;
      border-width: 12px;
    }
    100% {
      opacity: 0;
      scale: 9;
      border-width: 1px;
    }
  }
  @keyframes chest-fly {
    from {
      opacity: 0;
      transform: translateY(-60px) scale(0.2) rotate(-30deg);
    }
  }
  @keyframes chest-flip {
    from {
      transform: rotateY(180deg);
    }
  }
  @keyframes chest-foil {
    0% {
      transform: translateX(-130%) skewX(-16deg);
    }
    45%,
    100% {
      transform: translateX(230%) skewX(-16deg);
    }
  }
`

function Ball({ kind }: { kind: Chest['kind'] }) {
  const master = kind === 'special'
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g className="base">
        <path d="M4 50a46 46 0 0 0 92 0z" fill="#f4f4f4" />
        <path
          d="M4 50a46 46 0 0 0 92 0"
          fill="none"
          stroke="#14161a"
          strokeWidth="5"
        />
      </g>
      <g className="lid">
        <path
          d="M4 50a46 46 0 0 1 92 0z"
          fill={master ? '#7a3cc9' : '#f4f4f4'}
        />
        {master ? (
          <>
            <circle cx="24" cy="32" r="9" fill="#e04f9b" />
            <circle cx="76" cy="32" r="9" fill="#e04f9b" />
            <path
              d="M38 40V22l12 11 12-11v18"
              fill="none"
              stroke="#fff"
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <path
            d="M14 26a40 40 0 0 1 20-14"
            stroke="rgba(255,255,255,.9)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        )}
        <path
          d="M4 50a46 46 0 0 1 92 0"
          fill="none"
          stroke="#14161a"
          strokeWidth="5"
        />
      </g>
      <path
        d="M7 50h86"
        stroke={master ? '#14161a' : '#d8262c'}
        strokeWidth="7"
      />
      <circle
        cx="50"
        cy="50"
        r="13"
        fill="#f4f4f4"
        stroke="#14161a"
        strokeWidth="5"
      />
      <circle cx="50" cy="50" r="5" fill={master ? '#e04f9b' : '#d8262c'} />
    </svg>
  )
}

export default function ChestDialog({
  engine,
  chests,
  open,
  onPick,
  onClose,
}: Props) {
  const ref = useModal(open, onClose)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open'>('closed')
  const timer = useRef(0)
  const chest = chests[index]
  const shards = useChestShards(
    engine,
    open ? chest?.roundId : undefined,
    chest?.kind
  )

  useEffect(() => {
    if (!open) {
      setIndex(0)
      setPhase('closed')
    }
  }, [open])
  useEffect(() => () => clearTimeout(timer.current), [])

  const crack = () => {
    if (phase !== 'closed') return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    setPhase(still ? 'open' : 'opening')
    if (!still)
      timer.current = window.setTimeout(() => setPhase('open'), OPEN_MS)
  }
  const more = index < chests.length - 1

  return (
    <ChestStyle
      ref={ref}
      aria-labelledby="quiz-chest-title"
      data-kind={chest?.kind}
      data-phase={phase}
    >
      {chest && (
        <div className="scene" key={index}>
          <span className="rays" aria-hidden="true" />
          <span className="ring" aria-hidden="true" />
          <button
            type="button"
            className="dialog-close"
            aria-label="Đóng"
            onClick={() => ref.current?.close()}
          >
            ✕
          </button>
          <p className="kicker">{COPY[chest.kind].kicker}</p>
          <h2 id="quiz-chest-title">{COPY[chest.kind].title}</h2>
          <p className="hint" aria-live="polite">
            {phase === 'open'
              ? `${chest.gifts.length} món đã vào túi · chạm thẻ để xem`
              : COPY[chest.kind].hint}
          </p>
          {phase !== 'open' ? (
            <button
              type="button"
              className="orb"
              onClick={crack}
              aria-label={`Mở ${COPY[chest.kind].title}`}
            >
              <span className="orb-light" aria-hidden="true" />
              <Ball kind={chest.kind} />
            </button>
          ) : (
            <>
              <ul className="cards">
                {chest.gifts.map((id, i) => {
                  const item = itemById(id)
                  return (
                    <li key={`${id}-${i}`}>
                      <button
                        type="button"
                        className="gift"
                        data-valuable={isValuable(item) || undefined}
                        onClick={() => onPick(id)}
                        style={
                          {
                            '--i': i,
                            '--tier': TIERS[item.tier].color,
                          } as CSSProperties
                        }
                      >
                        <span className="gift-inner">
                          <span className="gift-back" aria-hidden="true" />
                          <span className="gift-front">
                            <span className="stars" aria-hidden="true">
                              {'★'.repeat(item.tier)}
                            </span>
                            <img
                              src={itemSprite(id)}
                              alt=""
                              width={30}
                              height={30}
                            />
                            <span className="name">
                              {item.name}
                              <span className="sr-only">
                                , {TIERS[item.tier].label}
                              </span>
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {chest.roundId && (
                <section
                  aria-label="Mảnh hổ phách"
                  className="chest-shards"
                  aria-live="polite"
                >
                  <h3>Mảnh hổ phách</h3>
                  {shards.error ? (
                    <p role="alert">
                      {shards.error.message === 'no_chest'
                        ? 'Rương này không có phần thưởng mảnh.'
                        : 'Chưa xác nhận được mảnh.'}
                    </p>
                  ) : shards.receipt?.state === 'awarded' ? (
                    shards.receipt.shards.length ? (
                      <ul>
                        {shards.receipt.shards.map((row) => {
                          const entry = speciesOf(row.speciesId)
                          const name = entry
                            ? quizLabel(entry.name)
                            : `Pokémon #${row.speciesId}`
                          const rare = !!entry && isRare(entry)
                          return (
                            <li
                              key={row.speciesId}
                              data-rare={rare || undefined}
                            >
                              {rare && <span className="rare">Hiếm</span>}
                              <img
                                src={getPokemonSprite(row.speciesId)}
                                alt=""
                                width={56}
                                height={56}
                              />
                              <span className="who">{name}</span>
                              <span className="many">×{row.count} mảnh</span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p>Lần này rương không có mảnh hổ phách.</p>
                    )
                  ) : (
                    <p>Đang xác nhận mảnh…</p>
                  )}
                  {(shards.error || shards.receipt?.state === 'pending') && (
                    <button type="button" onClick={shards.retry}>
                      Thử lại
                    </button>
                  )}
                </section>
              )}
              <button
                type="button"
                className="collect"
                onClick={() => {
                  if (more) {
                    setIndex(index + 1)
                    setPhase('closed')
                  } else ref.current?.close()
                }}
              >
                {more ? 'Còn một quả nữa ►' : 'Cất vào túi'}
              </button>
            </>
          )}
        </div>
      )}
    </ChestStyle>
  )
}
