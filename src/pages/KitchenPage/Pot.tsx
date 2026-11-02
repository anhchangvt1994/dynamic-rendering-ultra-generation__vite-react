import styled from 'styled-components'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  FLAVORS,
  FLAVOR_INFO,
  INGREDIENTS,
  itemById,
  itemSprite,
} from 'pages/QuizPage/items.mjs'
import { dishStats, groupOf, recipeKey } from './kitchen.mjs'
import StatChips from './StatChips'

type Flavor = keyof typeof FLAVOR_INFO
type Group = 'berry' | 'drink' | 'sweet'
const FLAVOR_KEYS = Object.keys(FLAVOR_INFO) as Flavor[]
export const POT_SIZE = 4
const GROUPS: { id: Group | 'all'; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'berry', label: 'Quả mọng' },
  { id: 'drink', label: 'Đồ uống' },
  { id: 'sweet', label: 'Bánh ngọt' },
]
// where the 4 slots float over the cauldron's mouth (% of the stage)
const ORBIT = [
  [17, 30],
  [37, 14],
  [63, 14],
  [83, 30],
]
// the pentagon's scale: a full axis is 40 (four tens of one flavour), so a
// usual pot of 3 fills a good part of it
const FULL = 40

const flavorsOf = (id: string) =>
  (FLAVORS as Record<string, Partial<Record<Flavor, number>>>)[id] ?? {}

/** The pot's flavours: each flavour's potencies summed. */
export function potFlavors(pot: string[]) {
  const sums: Record<Flavor, number> = {
    spicy: 0,
    dry: 0,
    sweet: 0,
    bitter: 0,
    sour: 0,
  }
  for (const id of pot)
    for (const [flavor, potency] of Object.entries(flavorsOf(id)))
      sums[flavor as Flavor] += potency ?? 0
  return sums
}

// an ingredient's flavours as a ring: one arc per flavour, by its share
const ringOf = (id: string) => {
  const flavors = flavorsOf(id)
  const total = FLAVOR_KEYS.reduce((sum, f) => sum + (flavors[f] ?? 0), 0)
  if (!total) return 'conic-gradient(#b9c6d6 0 100%)'
  let at = 0
  const stops = FLAVOR_KEYS.filter((f) => flavors[f]).map((f) => {
    const from = at
    at += ((flavors[f] ?? 0) / total) * 100
    return `${FLAVOR_INFO[f].color} ${from}% ${at}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

// the brew's colour: the flavours' colours mixed by their weight
const hex = (color: string) =>
  [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
export function liquidOf(sums: Record<Flavor, number>) {
  const total = FLAVOR_KEYS.reduce((sum, f) => sum + sums[f], 0)
  if (!total) return '#8ec5e8'
  const mix = [0, 0, 0]
  for (const f of FLAVOR_KEYS) {
    const [r, g, b] = hex(FLAVOR_INFO[f].color)
    const w = sums[f] / total
    mix[0] += r * w
    mix[1] += g * w
    mix[2] += b * w
  }
  return `rgb(${mix.map(Math.round).join(' ')})`
}

const flavorWords = (id: string) =>
  FLAVOR_KEYS.filter((f) => flavorsOf(id)[f])
    .map((f) => FLAVOR_INFO[f].label.toLowerCase())
    .join(', ') || 'không vị'

type Props = {
  bag: Record<string, number>
  pot: string[]
  /** pots that failed before, each sorted */
  attempts: string[][]
  onAdd: (id: string) => void
  onRemove: (index: number) => void
  onClear: () => void
  /** the cook button, or the invitation to sign in */
  action: ReactNode
}

/**
 * Free cooking, an alchemist's patisserie: glass bubbles of ingredients
 * (their flavours as a ring of colour) drop into a copper cauldron whose
 * brew takes the colour of what is in it; 4 slots float over its mouth; a
 * flavour star grows with the pot and tells what a dish of it would give.
 */
export default function Pot({
  bag,
  pot,
  attempts,
  onAdd,
  onRemove,
  onClear,
  action,
}: Props) {
  const [group, setGroup] = useState<Group | 'all'>('all')
  // what the bag has first; kept while the tab is open, so a bubble that
  // runs out stays where it is (nothing jumps under the finger)
  const [order] = useState(() =>
    [...INGREDIENTS].sort(
      (a, b) => Number((bag[b] ?? 0) > 0) - Number((bag[a] ?? 0) > 0)
    )
  )
  const inPot = (id: string) => pot.filter((x) => x === id).length
  const sums = potFlavors(pot)
  const liquid = liquidOf(sums)
  const tried =
    pot.length >= 2 && attempts.some((a) => a.join('+') === recipeKey(pot))
  const preview = pot.length >= 2 ? dishStats(pot, false) : null

  // the flavour star: a pentagon, one axis per flavour, from the top
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]
  }
  const shape = FLAVOR_KEYS.map((f, i) =>
    point(i, 6 + (Math.min(sums[f], FULL) / FULL) * 36).join(',')
  ).join(' ')

  return (
    <PotStyle
      className="pot-area"
      style={{ '--liquid': liquid } as CSSProperties}
    >
      <section className="pantry" aria-label="Nguyên liệu">
        <div
          className="pantry-groups"
          role="group"
          aria-label="Nhóm nguyên liệu"
        >
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <ul className="bubbles">
          {order
            .filter((id) => group === 'all' || groupOf(id) === group)
            .map((id) => {
              const left = (bag[id] ?? 0) - inPot(id)
              const item = itemById(id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="jar"
                    data-item={id}
                    data-empty={left <= 0 || undefined}
                    disabled={left <= 0 || pot.length >= POT_SIZE}
                    onClick={() => onAdd(id)}
                    aria-label={`Bỏ ${item.name} vào nồi: vị ${flavorWords(id)}, còn ${Math.max(0, left)}`}
                    style={{ '--ring': ringOf(id) } as CSSProperties}
                  >
                    <span className="bubble" aria-hidden="true">
                      <img
                        src={itemSprite(id)}
                        alt=""
                        width={30}
                        height={30}
                        loading="lazy"
                      />
                      <b className="jar-count">{`${Math.max(0, left)}`}</b>
                    </span>
                    <span className="jar-name">{item.name}</span>
                  </button>
                </li>
              )
            })}
        </ul>
      </section>

      <section className="cauldron" aria-label="Nồi">
        <div className="stage">
          <span className="halo" aria-hidden="true" />
          <svg className="pot-svg" viewBox="0 0 240 190" aria-hidden="true">
            <path
              className="flame f1"
              d="M78 182q-14-22 4-40 2 16 12 18-2-14 8-26 6 22 6 34-6 16-30 14z"
            />
            <path
              className="flame f2"
              d="M134 184q-12-24 8-42 0 14 10 18 0-14 10-24 6 22 2 34-8 16-30 14z"
            />
            <path
              d="M28 64h184l-14 82a34 34 0 0 1-34 28H76a34 34 0 0 1-34-28z"
              fill="#c9773f"
              stroke="#2a1630"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M48 92h144"
              stroke="#f0b27a"
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.75"
            />
            <path
              d="M58 150q62 18 124 0"
              stroke="#8f4a22"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              opacity="0.6"
            />
            <ellipse cx="120" cy="64" rx="96" ry="22" fill="#2a1630" />
            <ellipse className="brew" cx="120" cy="66" rx="86" ry="16" />
            <ellipse
              cx="96"
              cy="60"
              rx="22"
              ry="4"
              fill="#fff"
              opacity="0.35"
            />
            <path
              d="M10 70h22M208 70h22"
              stroke="#2a1630"
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
          <span className="fizz" aria-hidden="true" data-count={pot.length}>
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </span>
          <ol className="slots" aria-label="Trong nồi">
            {ORBIT.map(([x, y], index) => {
              const id = pot[index]
              return (
                <li key={index} style={{ left: `${x}%`, top: `${y}%` }}>
                  {id ? (
                    <button
                      key={`${index}-${id}`}
                      type="button"
                      className="slot"
                      onClick={() => onRemove(index)}
                      aria-label={`Lấy ${itemById(id).name} ra`}
                      style={{ '--ring': ringOf(id) } as CSSProperties}
                    >
                      <img src={itemSprite(id)} alt="" width={30} height={30} />
                    </button>
                  ) : (
                    <span className="slot" data-empty="">
                      <span className="sr-only">Ô trống</span>
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <div className="taste">
          <svg className="star" viewBox="0 0 100 100" aria-hidden="true">
            {[42, 28, 14].map((r) => (
              <polygon
                key={r}
                className="grid"
                points={FLAVOR_KEYS.map((_, i) => point(i, r).join(',')).join(
                  ' '
                )}
              />
            ))}
            {FLAVOR_KEYS.map((f, i) => {
              const [x, y] = point(i, 42)
              return (
                <line key={f} className="grid" x1="50" y1="50" x2={x} y2={y} />
              )
            })}
            <polygon className="shape" points={shape} />
          </svg>
          <dl className="flavor-meter">
            {FLAVOR_KEYS.map((flavor, i) => {
              const [x, y] = point(i, 49)
              return (
                <div
                  key={flavor}
                  data-flavor={flavor}
                  data-value={sums[flavor]}
                  style={
                    {
                      '--c': FLAVOR_INFO[flavor].color,
                      left: `${x}%`,
                      top: `${y}%`,
                    } as CSSProperties
                  }
                >
                  <dt>{FLAVOR_INFO[flavor].label}</dt>
                  <dd>{sums[flavor] / 10}</dd>
                </div>
              )
            })}
          </dl>
        </div>

        <div className="forecast" aria-live="polite">
          {preview ? (
            <>
              <span>Nếu thành món:</span>
              <StatChips stats={preview} />
            </>
          ) : (
            'Bỏ 2 đến 4 nguyên liệu vào nồi.'
          )}
        </div>
        {tried && (
          <p className="pot-warning" role="status">
            Tổ hợp này đã hỏng lần trước rồi!
          </p>
        )}
        <div className="pot-actions">
          {/* phones: what is in the pot, while the pantry scrolls */}
          <span className="dock-pot" aria-hidden="true">
            {Array.from({ length: POT_SIZE }, (_, i) =>
              pot[i] ? (
                <img
                  key={i}
                  src={itemSprite(pot[i])}
                  alt=""
                  width={30}
                  height={30}
                />
              ) : (
                <i key={i} />
              )
            )}
          </span>
          <button
            type="button"
            className="pot-clear"
            onClick={onClear}
            disabled={!pot.length}
          >
            Đổ ra
          </button>
          {action}
        </div>
      </section>
    </PotStyle>
  )
}

const PotStyle = styled.div`
  --night: #2a1630;
  --plum: #4a2552;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
  align-items: start;
  gap: 20px;

  /* ── the pantry: glass bubbles ── */
  .pantry {
    padding: 16px;
    border: 3px solid var(--ink);
    border-radius: 28px;
    background: #fff;
    box-shadow: 5px 5px 0 var(--ink);
  }
  .pantry-groups {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 14px;
  }
  .pantry-groups button {
    min-height: 36px;
    padding: 0 14px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }
  .pantry-groups button[aria-pressed='true'] {
    background: var(--ink);
    color: #fff;
  }
  .bubbles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 14px 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .jar {
    display: grid;
    justify-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 0;
    border: 0;
    background: none;
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  /* a glass bubble, its flavours as a ring of colour around it */
  .bubble {
    position: relative;
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    flex: none;
    border-radius: 50%;
    background: var(--ring);
    box-shadow: 0 6px 0 rgba(23, 45, 69, 0.18);
    transition:
      transform 180ms cubic-bezier(0.3, 1.6, 0.5, 1),
      filter 200ms;
  }
  .bubble::before {
    content: '';
    position: absolute;
    inset: 6px;
    border-radius: 50%;
    background:
      radial-gradient(circle at 32% 28%, #fff 0 10%, transparent 26%),
      radial-gradient(circle at 50% 60%, #f3fbff, #d7ecfa 70%, #bcd9ee);
    box-shadow: inset 0 -6px 10px rgba(23, 45, 69, 0.12);
  }
  .bubble img {
    position: relative;
    width: 36px;
    height: 36px;
    image-rendering: pixelated;
    animation: bob 3s ease-in-out infinite;
  }
  li:nth-child(2n) .bubble img {
    animation-delay: -1.4s;
  }
  .jar-count {
    position: absolute;
    right: -2px;
    top: -2px;
    display: grid;
    place-items: center;
    min-width: 26px;
    height: 26px;
    padding: 0 6px;
    border: 2px solid var(--ink);
    border-radius: 999px;
    background: #fff;
    font-size: 12px;
  }
  .jar-name {
    max-width: 92px;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    text-align: center;
  }
  .jar:not(:disabled):hover .bubble {
    transform: translateY(-4px) scale(1.06);
  }
  .jar:focus-visible {
    outline: none;
  }
  .jar:focus-visible .bubble {
    transform: translateY(-4px) scale(1.06);
    box-shadow:
      0 0 0 3px #fff,
      0 0 0 6px var(--ink);
  }
  .jar:not(:disabled):active .bubble {
    transform: scale(0.92);
  }
  .jar:disabled {
    cursor: default;
  }
  .jar[data-empty] .bubble {
    filter: grayscale(1) opacity(0.4);
  }
  .jar[data-empty] .jar-name {
    opacity: 0.5;
  }

  /* ── the cauldron, on its stove, at night ── */
  .cauldron {
    position: sticky;
    top: 16px;
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 3px solid var(--ink);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at 50% 30%,
        color-mix(in srgb, var(--liquid) 30%, transparent),
        transparent 60%
      ),
      radial-gradient(
          circle at 18% 12%,
          rgba(255, 230, 160, 0.25) 0 2px,
          transparent 3px
        )
        0 0 / 46px 46px,
      linear-gradient(170deg, var(--plum), var(--night));
    color: #fff;
    box-shadow: 5px 5px 0 var(--ink);
  }
  .stage {
    position: relative;
    height: 230px;
  }
  .halo {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 220px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--liquid) 70%, transparent),
      transparent
    );
    transform: translate(-50%, -50%);
    filter: blur(6px);
  }
  .pot-svg {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 240px;
    transform: translateX(-50%);
    overflow: visible;
  }
  .brew {
    fill: var(--liquid);
    transition: fill 400ms;
  }
  .flame {
    fill: #ffb347;
    stroke: #2a1630;
    stroke-width: 4;
    transform-origin: 50% 100%;
    transform-box: fill-box;
    animation: flicker 600ms ease-in-out infinite alternate;
  }
  .f2 {
    fill: #ff7a45;
    animation-delay: -300ms;
  }
  /* the brew fizzes: livelier the fuller the pot */
  .fizz {
    position: absolute;
    left: 50%;
    top: 104px;
    width: 150px;
    height: 70px;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .fizz i {
    position: absolute;
    bottom: 0;
    left: calc(8% + var(--i) * 16%);
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--liquid) 50%, #fff);
    opacity: 0;
    animation: fizz 1.8s ease-in infinite;
    animation-delay: calc(var(--i) * -0.3s);
  }
  .fizz[data-count='0'] i {
    animation: none;
  }
  .fizz[data-count='3'] i,
  .fizz[data-count='4'] i {
    animation-duration: 1.1s;
  }
  /* 4 slots floating over the mouth: fixed circles, never stretched */
  .slots {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .slots li {
    position: absolute;
    transform: translate(-50%, -50%);
  }
  .slots li:nth-child(odd) .slot {
    animation: hover 2.6s ease-in-out infinite;
  }
  .slots li:nth-child(even) .slot {
    animation: hover 2.6s ease-in-out -1.3s infinite;
  }
  .slot {
    position: relative;
    display: grid;
    place-items: center;
    width: 60px;
    height: 60px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--ring);
    cursor: pointer;
  }
  button.slot::before {
    content: '';
    position: absolute;
    inset: 5px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 30%,
      #fff 0 12%,
      #f3fbff 30%,
      #cfe6f6
    );
  }
  button.slot img {
    position: relative;
    image-rendering: pixelated;
    animation: drop 380ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .slot[data-empty] {
    border: 2px dashed rgba(255, 255, 255, 0.45);
    background: rgba(255, 255, 255, 0.06);
    cursor: default;
  }
  button.slot:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  /* the flavour star */
  .taste {
    position: relative;
    width: 200px;
    height: 200px;
    margin: 4px auto 0;
  }
  .star {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .star .grid {
    fill: none;
    stroke: rgba(255, 255, 255, 0.22);
    stroke-width: 0.6;
  }
  .star .shape {
    fill: color-mix(in srgb, var(--liquid) 55%, transparent);
    stroke: #fff;
    stroke-width: 1.2;
    stroke-linejoin: round;
    transition: all 300ms ease-out;
  }
  .flavor-meter {
    position: absolute;
    inset: 0;
    margin: 0;
  }
  .flavor-meter div {
    position: absolute;
    display: flex;
    align-items: baseline;
    gap: 3px;
    transform: translate(-50%, -50%);
    white-space: nowrap;
  }
  .flavor-meter dt {
    color: var(--c);
    font-size: 12px;
    font-weight: 800;
    filter: brightness(1.35);
  }
  .flavor-meter dd {
    margin: 0;
    font-size: 12px;
    font-weight: 800;
  }
  .forecast {
    display: grid;
    justify-items: center;
    gap: 6px;
    min-height: 56px;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
  }
  .forecast .stat-chips {
    justify-content: center;
    margin: 0;
  }
  .pot-warning {
    margin: 0;
    padding: 6px 10px;
    border-radius: 10px;
    background: rgba(232, 88, 125, 0.25);
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }
  .pot-actions {
    display: flex;
    gap: 8px;
  }
  .dock-pot {
    display: none;
  }
  .pot-clear,
  .pot-cook {
    min-height: 50px;
    padding: 0 16px;
    border: 3px solid var(--ink);
    border-radius: 16px;
    font: inherit;
    font-family: var(--font-display);
    font-size: 17px;
    box-shadow: 3px 3px 0 var(--ink);
    cursor: pointer;
  }
  .pot-clear {
    background: #fff;
    color: var(--ink);
  }
  .pot-cook {
    flex: 1;
    background: linear-gradient(100deg, #ffcf3a, #ff9fbd);
    color: var(--ink);
  }
  .pot-actions .sign-in-cook {
    flex: 1;
  }
  .pot-clear:disabled,
  .pot-cook:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .pot-clear:focus-visible,
  .pot-cook:focus-visible,
  .pantry-groups button:focus-visible {
    outline: 3px solid #ffcf3a;
    outline-offset: 3px;
  }

  @keyframes bob {
    50% {
      transform: translateY(-4px) rotate(-4deg);
    }
  }
  @keyframes hover {
    50% {
      transform: translateY(-6px);
    }
  }
  @keyframes drop {
    from {
      transform: translateY(-40px) scale(1.5);
      opacity: 0;
    }
  }
  @keyframes flicker {
    to {
      transform: scale(1.08, 0.9);
    }
  }
  @keyframes fizz {
    0% {
      opacity: 0;
      transform: translateY(0) scale(0.6);
    }
    30% {
      opacity: 0.9;
    }
    100% {
      opacity: 0;
      transform: translateY(-60px) scale(1.1);
    }
  }

  /* phones: the cauldron first, compact; the pantry under it; the cook
     buttons stay at hand */
  @media (max-width: 899px) {
    grid-template-columns: 1fr;
    .cauldron {
      position: relative;
      top: 0;
      order: -1;
    }
    .stage {
      height: 200px;
    }
    .pot-svg {
      width: 210px;
    }
    .taste {
      width: 170px;
      height: 170px;
    }
    /* the pot's buttons dock at the bottom of the screen */
    .pot-actions {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 20;
      align-items: center;
      padding: 8px;
      border: 3px solid var(--ink);
      border-radius: 22px;
      background: var(--night);
      box-shadow: 4px 4px 0 var(--ink);
    }
    .dock-pot {
      display: grid;
      grid-template-columns: repeat(2, 26px);
      gap: 2px;
    }
    .dock-pot img,
    .dock-pot i {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.14);
      image-rendering: pixelated;
    }
    .pot-clear {
      padding: 0 12px;
    }
    .bubbles {
      grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    }
    /* the last bubbles can scroll above the dock */
    .pantry {
      margin-bottom: 84px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .bubble img,
    .slot,
    button.slot img,
    .flame,
    .fizz i {
      animation: none !important;
    }
    .bubble,
    .star .shape,
    .brew {
      transition: none;
    }
  }
`
