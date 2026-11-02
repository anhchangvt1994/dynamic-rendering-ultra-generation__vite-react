import {
  FLAVORS,
  FLAVOR_INFO,
  INGREDIENTS,
  itemById,
  itemSprite,
} from 'pages/QuizPage/items.mjs'
import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import styled from 'styled-components'
import DishArt from './DishArt'
import type { DishView } from './engine/types'
import {
  KINDS,
  dishStats,
  flavorLevel,
  groupOf,
  recipeKey,
} from './kitchen.mjs'
import { missingOf, pinnedOf } from './kept.mjs'
import StatChips from './StatChips'

type Flavor = keyof typeof FLAVOR_INFO
type Group = 'berry' | 'drink' | 'sweet'
export type PantryGroup = Group | 'all'
const FLAVOR_KEYS = Object.keys(FLAVOR_INFO) as Flavor[]
export const POT_SIZE = 4
const GROUPS: { id: PantryGroup; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'berry', label: 'Quả mọng' },
  { id: 'drink', label: 'Đồ uống' },
  { id: 'sweet', label: 'Bánh ngọt' },
]
// where the 4 slots float over the cauldron's mouth (% of the stage)
const ORBIT = [
  [14, 33],
  [35, 15],
  [65, 15],
  [86, 33],
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
  /** the pot is a recipe the player knows: the brew shimmers gold */
  known?: boolean
  /** that recipe is a secret one found: its dish gives × 1.5 */
  secret?: boolean
  /** the pantry's group shown (kept by the page across its tabs) */
  group: PantryGroup
  onGroup: (group: PantryGroup) => void
  /** the secret being hunted: its flavour shadow is drawn to be filled */
  target?: DishView | null
  /** the secrets still to find, to hunt one */
  targets?: DishView[]
  onTarget?: (id: string | null) => void
}

// a level's bounds on a flavour axis, in sums (3 levels of a full axis)
const LEVEL_BOUNDS = [
  [0, FULL / 3],
  [FULL / 3, (FULL * 2) / 3],
  [(FULL * 2) / 3, FULL],
]
const radius = (sum: number) => 6 + (Math.min(sum, FULL) / FULL) * 36

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
  known = false,
  secret = false,
  group,
  onGroup,
  target = null,
  targets = [],
  onTarget,
}: Props) {
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
  const preview = pot.length >= 2 ? dishStats(pot, secret) : null

  // the flavour star: a pentagon, one axis per flavour, from the top
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]
  }
  const shape = FLAVOR_KEYS.map((f, i) =>
    point(i, radius(sums[f])).join(',')
  ).join(' ')
  // the hunt: which flavours already sit in the target's level
  const goal = target?.shape
  // an empty pot matches nothing yet, even the flavours the dish lacks
  const hits =
    goal && pot.length
      ? FLAVOR_KEYS.filter((f) => flavorLevel(sums[f]) === goal[f])
      : []
  const matched = !!goal && hits.length === FLAVOR_KEYS.length
  // its right ingredients found so far: pinned in the pot, or still owed
  const kept = target?.kept ?? []
  const pinned = pinnedOf(kept, pot)
  const missing = missingOf(kept, pot)
  const ghost = goal
    ? FLAVOR_KEYS.map((f, i) => {
        const [lo, hi] = LEVEL_BOUNDS[goal[f]]
        return point(i, radius((lo + hi) / 2)).join(',')
      }).join(' ')
    : ''

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
              onClick={() => onGroup(g.id)}
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

      <section
        className="cauldron"
        aria-label="Nồi"
        data-count={pot.length}
        data-known={known || undefined}
        data-matched={matched || undefined}
      >
        {targets.length > 0 && (
          <div className="hunt" role="group" aria-label="Món bí ẩn đang tìm">
            <button
              type="button"
              aria-pressed={!target}
              onClick={() => onTarget?.(null)}
            >
              Tự do
            </button>
            {targets.map((dish) => (
              <button
                key={dish.id}
                type="button"
                aria-pressed={target?.id === dish.id}
                aria-label={`Tìm ${KINDS[dish.kind as keyof typeof KINDS]?.label ?? 'món'} bí ẩn, ${dish.count} nguyên liệu`}
                onClick={() => onTarget?.(dish.id)}
              >
                <DishArt kind={dish.kind} top={dish.top} secret size={26} />
                <span aria-hidden="true">
                  {KINDS[dish.kind as keyof typeof KINDS]?.label}
                  <small> · {dish.count}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="stage">
          <span className="halo" aria-hidden="true" />
          {/* embers drifting up from the fire */}
          <span className="embers" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} style={{ '--i': i } as CSSProperties} />
            ))}
          </span>
          <svg className="pot-svg" viewBox="0 0 300 250" aria-hidden="true">
            <defs>
              <linearGradient id="copper" x1="0" x2="1">
                <stop offset="0" stopColor="#5e2a12" />
                <stop offset="0.22" stopColor="#c4683a" />
                <stop offset="0.42" stopColor="#f7c08c" />
                <stop offset="0.58" stopColor="#df874c" />
                <stop offset="1" stopColor="#5e2a12" />
              </linearGradient>
              <linearGradient id="rim" x1="0" x2="1">
                <stop offset="0" stopColor="#7a3a1a" />
                <stop offset="0.45" stopColor="#ffd2a1" />
                <stop offset="1" stopColor="#7a3a1a" />
              </linearGradient>
              <radialGradient id="brew" cx="0.4" cy="0.35" r="0.8">
                <stop offset="0" className="brew-light" />
                <stop offset="0.7" className="brew-mid" />
                <stop offset="1" className="brew-deep" />
              </radialGradient>
              <clipPath id="mouth">
                <ellipse cx="150" cy="104" rx="98" ry="21" />
              </clipPath>
            </defs>
            {/* the fire: crossed logs, three flames */}
            <ellipse
              cx="150"
              cy="240"
              rx="104"
              ry="9"
              fill="rgba(0,0,0,0.35)"
            />
            <rect
              x="70"
              y="222"
              width="160"
              height="16"
              rx="8"
              fill="#6b3b1f"
              stroke="#2a1630"
              strokeWidth="5"
              transform="rotate(-8 150 230)"
            />
            <rect
              x="70"
              y="222"
              width="160"
              height="16"
              rx="8"
              fill="#7d4826"
              stroke="#2a1630"
              strokeWidth="5"
              transform="rotate(8 150 230)"
            />
            <path
              className="flame back"
              d="M108 228c-16-26 4-48 10-62 4 18 16 22 16 34 8-16 4-30 16-44 16 22 24 46 12 72z"
            />
            <path
              className="flame mid"
              d="M124 230c-12-22 2-40 10-50 2 14 12 18 12 28 8-12 6-22 14-32 10 18 14 38 4 54z"
            />
            <path
              className="flame core"
              d="M138 232c-6-14 2-26 8-32 2 10 8 12 8 18 4-6 4-12 8-18 6 12 8 24 0 32z"
            />
            {/* the cauldron: a round copper belly, a band of rivets, handles */}
            <path
              d="M54 108c-8 64 30 116 96 116s104-52 96-116z"
              fill="url(#copper)"
              stroke="#2a1630"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M58 140c40 18 144 18 184 0"
              fill="none"
              stroke="#2a1630"
              strokeWidth="5"
              opacity="0.55"
            />
            {[78, 108, 150, 192, 222].map((x, i) => (
              <circle
                key={x}
                cx={x}
                cy={i === 2 ? 153 : i % 4 === 0 ? 146 : 151}
                r="3.4"
                fill="#ffd2a1"
                stroke="#2a1630"
                strokeWidth="2"
              />
            ))}
            <path
              d="M84 196c26 16 106 16 132 0"
              fill="none"
              stroke="#fff"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.18"
            />
            <ellipse
              cx="42"
              cy="124"
              rx="13"
              ry="17"
              fill="none"
              stroke="#2a1630"
              strokeWidth="9"
            />
            <ellipse
              cx="42"
              cy="124"
              rx="13"
              ry="17"
              fill="none"
              stroke="#e7a16a"
              strokeWidth="4"
            />
            <ellipse
              cx="258"
              cy="124"
              rx="13"
              ry="17"
              fill="none"
              stroke="#2a1630"
              strokeWidth="9"
            />
            <ellipse
              cx="258"
              cy="124"
              rx="13"
              ry="17"
              fill="none"
              stroke="#e7a16a"
              strokeWidth="4"
            />
            {/* the rim, the brew: a whirl seen in perspective, bubbles */}
            <ellipse
              cx="150"
              cy="104"
              rx="112"
              ry="28"
              fill="url(#rim)"
              stroke="#2a1630"
              strokeWidth="6"
            />
            <ellipse cx="150" cy="104" rx="98" ry="21" fill="#1a0c1f" />
            <g clipPath="url(#mouth)">
              <ellipse
                className="brew"
                cx="150"
                cy="106"
                rx="98"
                ry="21"
                fill="url(#brew)"
              />
              <g transform="translate(150 106) scale(1 0.22)">
                <g className="whirl">
                  <path d="M0 0c22-6 46 8 50 34" />
                  <path d="M0 0c-22 6-46-8-50-34" />
                  <path d="M0 0c6 22-8 46-34 50" />
                  <path d="M0 0c-6-22 8-46 34-50" />
                  <circle r="70" />
                </g>
              </g>
              {[
                [112, 104],
                [176, 100],
                [146, 112],
                [196, 110],
                [100, 110],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  className="pop"
                  cx={x}
                  cy={y}
                  r="4.5"
                  style={{ '--i': i } as CSSProperties}
                />
              ))}
              <ellipse
                cx="118"
                cy="98"
                rx="30"
                ry="4"
                fill="#fff"
                opacity="0.28"
              />
            </g>
          </svg>
          {/* steam the colour of the brew */}
          <span className="steam" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <ol className="slots" aria-label="Trong nồi">
            {ORBIT.map(([x, y], index) => {
              const id = pot[index]
              return (
                <li
                  key={index}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  data-unneeded={
                    (!!target?.count && index >= target.count) || undefined
                  }
                >
                  {id ? (
                    <button
                      key={`${index}-${id}`}
                      type="button"
                      className="slot soap"
                      data-pinned={pinned[index] || undefined}
                      onClick={() => onRemove(index)}
                      aria-label={`Lấy ${itemById(id).name} ra${pinned[index] ? ' (nguyên liệu đúng)' : ''}`}
                    >
                      <img src={itemSprite(id)} alt="" width={30} height={30} />
                    </button>
                  ) : (
                    <span className="slot soap" data-empty="">
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
            {goal && (
              <g className="ghost" aria-hidden="true">
                {/* each flavour's level: a soft band along its axis */}
                {FLAVOR_KEYS.map((f, i) => {
                  const [lo, hi] = LEVEL_BOUNDS[goal[f]]
                  const [x1, y1] = point(i, radius(lo))
                  const [x2, y2] = point(i, radius(hi))
                  return (
                    <line
                      key={f}
                      className="ghost-band"
                      data-hit={hits.includes(f) || undefined}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                    />
                  )
                })}
                <polygon className="ghost-shape" points={ghost} />
              </g>
            )}
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
                  data-hit={(goal && hits.includes(flavor)) || undefined}
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

        {target && (kept.length > 0 || missing.length > 0) && (
          <p className="kept-note">
            {missing.length ? (
              <>
                Cần thêm
                {missing.map((id, i) => (
                  <img
                    key={i}
                    src={itemSprite(id)}
                    alt={itemById(id).name}
                    width={22}
                    height={22}
                  />
                ))}
                <span>
                  ({kept.length - missing.length}/{kept.length} đúng)
                </span>
              </>
            ) : (
              <>
                Đã ghim <b>{kept.length}</b> nguyên liệu đúng
              </>
            )}
          </p>
        )}
        {goal && (
          <p className="hunt-score" aria-live="polite">
            {matched ? (
              'Hình vị khớp rồi, nấu thử!'
            ) : !pot.length ? (
              'Bỏ nguyên liệu vào để phủ kín bóng'
            ) : (
              <>
                Khớp <b>{hits.length}/5</b> vị
              </>
            )}
          </p>
        )}
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
            Thu lại
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
  /* a soap bubble on the shelf: an iridescent film, a glint, and a thin
     rim in the ingredient's flavours (their shares) */
  .bubble {
    position: relative;
    display: grid;
    place-items: center;
    width: 76px;
    height: 76px;
    flex: none;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 60%, #f4fbff, #e4f2fb 70%);
    box-shadow: 0 6px 0 rgba(23, 45, 69, 0.14);
    transition:
      transform 180ms cubic-bezier(0.3, 1.6, 0.5, 1),
      filter 200ms;
  }
  .bubble::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(circle at 30% 26%, #fff 0 6%, transparent 14%),
      conic-gradient(from 60deg, #ff6ec7, #6ebeff, #8cffbe, #ffe66e, #ff6ec7);
    -webkit-mask: radial-gradient(
      circle,
      rgba(0, 0, 0, 0.08) 50%,
      rgba(0, 0, 0, 0.5) 66%,
      transparent 72%
    );
    mask: radial-gradient(
      circle,
      rgba(0, 0, 0, 0.08) 50%,
      rgba(0, 0, 0, 0.5) 66%,
      transparent 72%
    );
  }
  .bubble::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: var(--ring);
    -webkit-mask: radial-gradient(
      circle closest-side,
      transparent calc(100% - 4px),
      #000 calc(100% - 3.5px)
    );
    mask: radial-gradient(
      circle closest-side,
      transparent calc(100% - 4px),
      #000 calc(100% - 3.5px)
    );
  }
  .bubble img {
    position: relative;
    z-index: 1;
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
    z-index: 1;
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

  /* ── the cauldron over its fire, at night ── */
  .cauldron {
    position: sticky;
    top: 16px;
    display: grid;
    gap: 12px;
    padding: 16px;
    overflow: hidden;
    border: 3px solid var(--ink);
    border-radius: 28px;
    background:
      radial-gradient(
        circle at 50% 42%,
        color-mix(in srgb, var(--liquid) 28%, transparent),
        transparent 58%
      ),
      radial-gradient(
        circle at 50% 100%,
        rgba(255, 140, 60, 0.35),
        transparent 45%
      ),
      linear-gradient(170deg, var(--plum), var(--night));
    color: #fff;
    box-shadow: 5px 5px 0 var(--ink);
  }
  .stage {
    position: relative;
    height: 300px;
  }
  .halo {
    position: absolute;
    left: 50%;
    top: 58%;
    width: 300px;
    height: 150px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--liquid) 65%, transparent),
      transparent
    );
    transform: translate(-50%, -50%);
    filter: blur(8px);
  }
  .pot-svg {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: min(300px, 100%);
    transform: translateX(-50%);
    overflow: visible;
  }
  /* the brew: its colour is the pot's flavours */
  .brew-light {
    stop-color: color-mix(in srgb, var(--liquid) 45%, #fff);
  }
  .brew-mid {
    stop-color: var(--liquid);
  }
  .brew-deep {
    stop-color: color-mix(in srgb, var(--liquid) 55%, #1a0c1f);
  }
  .whirl {
    fill: none;
    stroke: rgba(255, 255, 255, 0.4);
    stroke-width: 5;
    stroke-linecap: round;
    animation: whirl 5s linear infinite;
  }
  .whirl circle {
    stroke: rgba(255, 255, 255, 0.14);
    stroke-width: 3;
  }
  .pop {
    fill: color-mix(in srgb, var(--liquid) 35%, #fff);
    stroke: rgba(255, 255, 255, 0.8);
    stroke-width: 1;
    transform-box: fill-box;
    transform-origin: center;
    opacity: 0;
    animation: brew-pop 2.4s ease-in infinite;
    animation-delay: calc(var(--i) * -0.48s);
  }
  .cauldron[data-count='0'] .pop,
  .cauldron[data-count='0'] .steam i {
    animation: none;
  }
  /* a pot that is a known recipe shimmers gold: ready to cook */
  .cauldron[data-known] .brew {
    animation: brew-gold 1.4s ease-in-out infinite alternate;
  }
  .flame {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    animation: flicker 520ms ease-in-out infinite alternate;
  }
  .flame.back {
    fill: #ff5a36;
    stroke: #2a1630;
    stroke-width: 4;
  }
  .flame.mid {
    fill: #ffa23a;
    animation-duration: 430ms;
    animation-delay: -200ms;
  }
  .flame.core {
    fill: #ffe58a;
    animation-duration: 360ms;
  }
  .embers {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .embers i {
    position: absolute;
    bottom: 34px;
    left: calc(40% + var(--i) * 3%);
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ffd27a;
    box-shadow: 0 0 6px #ff7a45;
    opacity: 0;
    animation: ember 2.6s ease-out infinite;
    animation-delay: calc(var(--i) * -0.37s);
  }
  .steam {
    position: absolute;
    left: 50%;
    top: 92px;
    width: 200px;
    height: 70px;
    transform: translateX(-50%);
    pointer-events: none;
  }
  .steam i {
    position: absolute;
    bottom: 0;
    width: 50px;
    height: 70px;
    border-radius: 50%;
    background: radial-gradient(
      color-mix(in srgb, var(--liquid) 45%, #fff),
      transparent 70%
    );
    filter: blur(6px);
    opacity: 0;
    animation: steam 3.2s ease-out infinite;
  }
  .steam i:nth-child(1) {
    left: 8%;
  }
  .steam i:nth-child(2) {
    left: 40%;
    animation-delay: -1.1s;
  }
  .steam i:nth-child(3) {
    left: 70%;
    animation-delay: -2.2s;
  }

  /* 4 soap bubbles floating over the mouth: an iridescent film, a glint,
     a thin bright rim; filled, an ingredient inside */
  .slots {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .slots li {
    position: absolute;
    transform: translate(-50%, -50%);
  }
  .soap {
    position: relative;
    display: grid;
    place-items: center;
    width: 66px;
    height: 66px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    animation: drift 4.2s ease-in-out infinite;
  }
  .slots li:nth-child(even) .soap {
    animation-delay: -2.1s;
  }
  .soap::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background:
      radial-gradient(circle at 30% 26%, #fff 0 5%, transparent 13%),
      radial-gradient(
        circle at 70% 74%,
        rgba(255, 255, 255, 0.6) 0 4%,
        transparent 10%
      ),
      conic-gradient(from 30deg, #ff6ec7, #6ebeff, #8cffbe, #ffe66e, #ff6ec7);
    -webkit-mask: radial-gradient(
      circle,
      rgba(0, 0, 0, 0.12) 46%,
      rgba(0, 0, 0, 0.55) 62%,
      #000 68%,
      #000 70%,
      transparent 71%
    );
    mask: radial-gradient(
      circle,
      rgba(0, 0, 0, 0.12) 46%,
      rgba(0, 0, 0, 0.55) 62%,
      #000 68%,
      #000 70%,
      transparent 71%
    );
    box-shadow: 0 0 18px rgba(170, 220, 255, 0.35);
    animation: film 6s linear infinite;
  }
  .soap img {
    position: relative;
    width: 34px;
    height: 34px;
    image-rendering: pixelated;
  }
  button.soap {
    animation:
      inflate 460ms cubic-bezier(0.3, 1.6, 0.5, 1),
      drift 4.2s ease-in-out 460ms infinite;
  }
  .soap[data-empty] {
    width: 54px;
    height: 54px;
    cursor: default;
    opacity: 0.8;
  }
  button.soap:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  /* the hunt: which secret's shadow to fill */
  .hunt {
    display: flex;
    gap: 6px;
    margin: -4px -4px 0;
    padding: 2px 4px 6px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .hunt button {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 4px;
    height: 36px;
    padding: 0 12px 0 6px;
    border: 2px solid rgba(255, 255, 255, 0.28);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
  }
  .hunt button:first-child {
    padding-left: 12px;
  }
  .hunt small {
    font-size: 11px;
    opacity: 0.7;
  }
  .hunt button[aria-pressed='true'] {
    border-color: #c9b6ff;
    background: #5b3f99;
    box-shadow:
      0 0 0 2px var(--night),
      0 0 0 4px #c9b6ff;
  }
  .hunt button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .hunt .dish-art svg {
    filter: brightness(0) invert(1) opacity(0.85);
  }
  /* a right ingredient found before: a gold rim and a tick */
  .soap[data-pinned]::after {
    content: '✓';
    position: absolute;
    right: 2px;
    bottom: 2px;
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: 2px solid var(--night);
    border-radius: 50%;
    background: #ffcf3a;
    color: #3a2400;
    font-size: 11px;
    font-weight: 900;
    line-height: 1;
  }
  .soap[data-pinned] {
    box-shadow:
      inset 0 0 0 3px #ffcf3a,
      0 0 18px rgba(255, 207, 58, 0.6);
  }
  .kept-note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 24px;
    margin: 4px 0 0;
    color: #ffe9a8;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }
  .kept-note span {
    opacity: 0.75;
  }
  .kept-note img {
    image-rendering: pixelated;
  }
  /* a slot the hunted dish doesn't need */
  .slots li[data-unneeded] .soap[data-empty] {
    opacity: 0.25;
    border-style: dashed;
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
  /* the secret's shadow: the bands to reach, a dashed outline through them */
  .ghost-band {
    stroke: rgba(201, 182, 255, 0.4);
    stroke-width: 7;
    stroke-linecap: round;
    transition: stroke 240ms ease-out;
  }
  .ghost-band[data-hit] {
    stroke: rgba(76, 195, 138, 0.75);
  }
  .ghost-shape {
    fill: rgba(201, 182, 255, 0.12);
    stroke: #c9b6ff;
    stroke-width: 1;
    stroke-dasharray: 3 2.5;
    stroke-linejoin: round;
  }
  .cauldron[data-matched] .ghost-shape {
    fill: rgba(76, 195, 138, 0.22);
    stroke: #7ef0b5;
    animation: ghost-glow 1.4s ease-in-out infinite alternate;
  }
  @keyframes ghost-glow {
    to {
      opacity: 0.55;
    }
  }
  .flavor-meter div[data-hit] dt::after {
    content: ' ✓';
    color: #7ef0b5;
  }
  .hunt-score {
    margin: -4px 0 0;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }
  .hunt-score b {
    color: #7ef0b5;
    font-variant-numeric: tabular-nums;
  }
  .cauldron[data-matched] .hunt-score {
    color: #7ef0b5;
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
  @keyframes drift {
    0%,
    100% {
      transform: translateY(0) scale(1, 1);
    }
    33% {
      transform: translateY(-6px) scale(1.04, 0.97);
    }
    66% {
      transform: translateY(3px) scale(0.97, 1.03);
    }
  }
  @keyframes inflate {
    from {
      transform: scale(0.2);
      opacity: 0.3;
    }
  }
  @keyframes film {
    to {
      filter: hue-rotate(360deg);
    }
  }
  @keyframes whirl {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes brew-pop {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      transform: scale(1);
      opacity: 1;
    }
    90% {
      transform: scale(1.6);
      opacity: 0;
    }
    100% {
      transform: scale(0);
      opacity: 0;
    }
  }
  @keyframes brew-gold {
    to {
      filter: brightness(1.25) drop-shadow(0 0 6px #ffd34d);
    }
  }
  @keyframes flicker {
    to {
      transform: scale(1.08, 0.88) skewX(-3deg);
    }
  }
  @keyframes ember {
    0% {
      opacity: 0;
      transform: translate(0, 0);
    }
    15% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(calc((var(--i) - 3) * 9px), -150px);
    }
  }
  @keyframes steam {
    0% {
      opacity: 0;
      transform: translateY(20px) scale(0.6);
    }
    40% {
      opacity: 0.55;
    }
    100% {
      opacity: 0;
      transform: translateY(-40px) scale(1.3);
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
      height: 270px;
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
    .soap,
    .soap::before,
    .flame,
    .whirl,
    .pop,
    .embers i,
    .steam i,
    .cauldron[data-known] .brew,
    .cauldron[data-matched] .ghost-shape {
      animation: none !important;
    }
    .bubble,
    .star .shape,
    .ghost-band,
    .brew {
      transition: none;
    }
  }
`
