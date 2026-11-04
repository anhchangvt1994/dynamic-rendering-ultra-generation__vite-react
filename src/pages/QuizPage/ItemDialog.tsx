import { TYPE_DATA } from 'components/pokemon-page/type-data.mjs'
import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import Flavors from './Flavors'
import {
  GROUPS,
  TIERS,
  isValuable,
  itemById,
  itemSprite,
  kindLabel,
} from './items.mjs'
import { fullCount } from './progress.mjs'
import { dialogCss, useModal } from './useModal'
import { isItemNameStuck } from './itemCardScroll.mjs'

type Props = {
  id: string | null
  /** how many the player has */
  count: number
  onClose: () => void
}

// the compact name bar's height, over the top of a scrolled card
const BAR = 60
// the move's numbers against the strongest machines in the catalogue
const MOVE_BARS: [string, 'power' | 'accuracy' | 'pp', number][] = [
  ['Sức mạnh', 'power', 150],
  ['Chính xác', 'accuracy', 100],
  ['PP', 'pp', 30],
]

/*
 * An item as a holographic card: the sprite on a pedestal of light in its
 * tier's colour, what it does, its numbers, and what it will be for.
 */
export const ItemCardStyle = styled.div`
  /* the card is the frame: its close button and its foil stay put while
     the content scrolls inside it, with no scrollbar showing */
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: calc(100svh - 24px);
    border-radius: 28px;
    background:
      radial-gradient(
        120% 70% at 50% 0,
        color-mix(in srgb, var(--tier) 30%, transparent),
        transparent 70%
      ),
      #0b1830;
    box-shadow: 0 30px 80px -20px color-mix(in srgb, var(--tier) 50%, #000);
  }
  /* the rim, drawn over everything: the pinned bar and count never hide it */
  .card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 6;
    border-radius: inherit;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--tier) 70%, transparent);
    pointer-events: none;
  }
  .card-scroll {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .card-scroll::-webkit-scrollbar {
    display: none;
  }
  /* the foil: a slanted sheen crosses the whole card, from off its left
     edge to off its right one, then rests before the next pass */
  &[data-valuable] .card::after {
    content: '';
    position: absolute;
    top: -10%;
    bottom: -10%;
    left: 0;
    z-index: 4;
    width: 55%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.18) 42%,
      color-mix(in srgb, var(--tier) 34%, transparent) 55%,
      transparent
    );
    pointer-events: none;
    mix-blend-mode: screen;
    transform: translateX(-130%) skewX(-16deg);
    animation: item-foil 4.2s cubic-bezier(0.45, 0.05, 0.35, 1) infinite;
  }
  .hero {
    position: relative;
    display: grid;
    place-items: center;
    height: 180px;
    overflow: hidden;
    isolation: isolate;
  }
  .rays {
    position: absolute;
    inset: -60%;
    z-index: -1;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--tier) 40%, transparent) 0 8deg,
      transparent 8deg 20deg
    );
    -webkit-mask: radial-gradient(circle, #000 10%, transparent 46%);
    mask: radial-gradient(circle, #000 10%, transparent 46%);
    animation: item-spin 24s linear infinite;
  }
  .pedestal {
    position: absolute;
    bottom: 26px;
    width: 150px;
    height: 34px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--tier) 70%, #fff),
      color-mix(in srgb, var(--tier) 30%, transparent) 60%,
      transparent
    );
    filter: blur(2px);
  }
  .sprite {
    width: 120px;
    height: 120px;
    image-rendering: pixelated;
    filter: drop-shadow(0 8px 0 rgba(0, 0, 0, 0.35))
      drop-shadow(0 0 18px color-mix(in srgb, var(--tier) 60%, transparent));
    animation: item-float 2.6s ease-in-out infinite;
  }
  /* the stars stay put in the card's corner; the bar takes them over */
  .stars {
    position: absolute;
    left: 22px;
    top: 24px;
    z-index: 4;
    color: var(--tier);
    font-size: 15px;
    letter-spacing: 2px;
    text-shadow: 0 0 10px var(--tier);
    pointer-events: none;
    transition: opacity 200ms ease-out;
  }
  .card[data-stuck] .stars {
    opacity: 0;
  }
  /* the tier, kind and name read as one block; the rest a step below */
  .card-head {
    display: grid;
    gap: 8px;
    /* a breath between the artwork and the name block */
    padding: 18px 22px 0;
    transition: opacity 220ms ease-out;
  }
  /* the bar has the name now: the big one fades as it goes under */
  .card[data-stuck] .card-head {
    opacity: 0;
  }
  .body {
    display: grid;
    gap: 14px;
    padding: 16px 22px 22px;
  }
  /* the pinned count follows straight on */
  .body:has(+ .owned) {
    padding-bottom: 0;
  }
  .eyebrow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
  }
  .tier-chip {
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--tier);
    color: #0b1830;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 11px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 30px;
    line-height: 1.05 !important;
    text-transform: uppercase;
    color: #fff;
    text-shadow: 0 3px 0 color-mix(in srgb, var(--tier) 45%, #000);
  }
  .move {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.75);
  }
  .type {
    padding: 3px 10px;
    border-radius: 999px;
    color: #fff;
    font-weight: 800;
  }
  .effect {
    margin: 0;
    font-size: 15px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.9);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stats li {
    display: grid;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  .stats b {
    font-family: var(--font-display);
    font-size: 22px;
    line-height: 1.1 !important;
    color: var(--tier);
  }
  .stats span {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.65);
  }
  .bars {
    display: grid;
    gap: 8px;
    margin: 0;
  }
  .bars div {
    display: grid;
    grid-template-columns: 74px 1fr 36px;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 700;
  }
  .bars dt {
    color: rgba(255, 255, 255, 0.65);
  }
  .bars dd {
    display: contents;
  }
  .bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    width: calc(var(--v) * 100%);
    border-radius: inherit;
    background: linear-gradient(90deg, var(--type), #fff);
    animation: item-bar 700ms cubic-bezier(0.2, 0.9, 0.3, 1) 200ms both;
  }
  .bars b {
    text-align: right;
    font-family: var(--font-display);
    font-size: 15px;
  }
  .use {
    display: grid;
    gap: 6px;
    padding: 14px;
    border-radius: 16px;
    background: rgba(5, 15, 28, 0.55);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  .use h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tier);
  }
  .use p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
  }
  .use .soon {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
  }
  /* how many are in the bag: pinned to the card's bottom while it scrolls */
  .owned {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin: 0;
    padding: 26px 22px 18px;
    background: linear-gradient(transparent, #0b1830 46%);
    font-size: 13px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.7);
  }
  .owned b {
    color: #fff;
    font-family: var(--font-display);
    font-size: 20px;
  }

  /* the name, compact, once the big heading has scrolled away: it slides in
     over the content (outside its flow, so nothing below moves) */
  .card-bar {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    z-index: 3;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 10px 64px 10px 14px;
    background:
      linear-gradient(
        color-mix(in srgb, var(--tier) 16%, transparent),
        transparent
      ),
      #0b1830;
    box-shadow:
      inset 0 -1.5px 0 color-mix(in srgb, var(--tier) 55%, transparent),
      0 10px 20px -10px rgba(0, 0, 0, 0.7);
    opacity: 0;
    translate: 0 -100%;
    pointer-events: none;
    transition:
      opacity 220ms ease-out,
      translate 280ms cubic-bezier(0.2, 0.9, 0.3, 1);
  }
  .card[data-stuck] .card-bar {
    opacity: 1;
    translate: 0 0;
  }
  .card-bar img {
    width: 40px;
    height: 40px;
    image-rendering: pixelated;
    filter: drop-shadow(
      0 0 6px color-mix(in srgb, var(--tier) 60%, transparent)
    );
  }
  .card-bar-text {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .card-bar-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--tier);
    font-size: 11px;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .card-bar-meta .tier-chip {
    padding: 1px 7px;
    font-size: 9px;
    letter-spacing: 0.06em;
  }
  /* the whole name, on two lines if it must */
  .card-bar-name {
    display: -webkit-box;
    overflow: hidden;
    font-family: var(--font-display);
    font-size: 15px;
    line-height: 1.15 !important;
    text-transform: uppercase;
    color: #fff;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  @keyframes item-foil {
    0% {
      transform: translateX(-130%) skewX(-16deg);
    }
    45%,
    100% {
      transform: translateX(260%) skewX(-16deg);
    }
  }
  @keyframes item-spin {
    to {
      rotate: 360deg;
    }
  }
  @keyframes item-float {
    50% {
      translate: 0 -8px;
    }
  }
  @keyframes item-bar {
    from {
      width: 0;
    }
  }
`

const ItemDialogStyle = styled.dialog`
  ${dialogCss}
  --dialog-w: 400px;
`

type CardProps = {
  id: string
  /** how many the player has */
  count: number
  /** the heading's id, for what labels the card */
  headingId: string
  /** in a dialog: its close button */
  onClose?: () => void
}

/** The item's card: in the quiz's dialog, and beside the bag's list. */
export function ItemCard({ id, count, headingId, onClose }: CardProps) {
  const item = itemById(id)
  const tier = TIERS[item.tier]
  const type = item.move ? TYPE_DATA[item.move.type] : null
  const scrollRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const [stuck, setStuck] = useState(false)

  // the compact bar (BAR px tall) takes over as the big name goes under it
  useEffect(() => {
    const scroll = scrollRef.current
    const name = nameRef.current
    if (!scroll || !name) return
    const update = () => setStuck(isItemNameStuck(scroll, name, BAR))
    // Hidden dialogs have no geometry; observe their layout when opened too.
    const resize = new ResizeObserver(update)
    resize.observe(scroll)
    resize.observe(name)
    if (name.parentElement) resize.observe(name.parentElement)
    update()
    scroll.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      resize.disconnect()
      scroll.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [id])

  return (
    <ItemCardStyle
      className="item-card"
      data-valuable={isValuable(item) || undefined}
      style={{ '--tier': tier.color } as CSSProperties}
    >
      <article className="card" data-stuck={stuck || undefined}>
        <div className="card-bar" aria-hidden="true">
          <img src={itemSprite(item.id)} alt="" width={30} height={30} />
          <span className="card-bar-text">
            <span className="card-bar-meta">
              {'★'.repeat(item.tier)}
              <span className="tier-chip">{tier.label}</span>
            </span>
            <span className="card-bar-name">{item.name}</span>
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="dialog-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            ✕
          </button>
        )}
        <span className="stars" aria-hidden="true">
          {'★'.repeat(item.tier)}
        </span>
        <div ref={scrollRef} className="card-scroll">
          <div className="hero">
            <span className="rays" aria-hidden="true" />
            <span className="pedestal" aria-hidden="true" />
            <img
              className="sprite"
              src={itemSprite(item.id)}
              alt=""
              width={30}
              height={30}
            />
          </div>
          <div className="card-head">
            <p className="eyebrow">
              <span className="tier-chip">{tier.label}</span>
              {kindLabel(item)} · {GROUPS[item.group].label}
            </p>
            <h2 ref={nameRef} id={headingId}>
              {item.name}
            </h2>
          </div>
          <div className="body">
            {item.move && type && (
              <p className="move">
                <span className="type" style={{ background: type.color }}>
                  {type.label}
                </span>
                {item.move.category}
              </p>
            )}
            <p className="effect">{item.effect}</p>
            {/* an ingredient's taste: the kitchen's clue */}
            <Flavors id={item.id} className="item-flavors" />
            {item.move && type ? (
              <dl
                className="bars"
                style={{ '--type': type.color } as CSSProperties}
              >
                {MOVE_BARS.map(([label, key, max]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      <span className="bar">
                        <i
                          style={
                            {
                              '--v': Math.min(1, item.move[key] / max),
                            } as CSSProperties
                          }
                        />
                      </span>
                      <b>{item.move[key]}</b>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <ul className="stats">
                {item.stats.map(([label, value]: [string, string]) => (
                  <li key={label}>
                    <b>{value}</b>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}
            <section className="use">
              <h3>Dùng để làm gì?</h3>
              <p>{GROUPS[item.group].use}</p>
              <p className="soon">
                Vật phẩm được cất trong túi, dùng được khi tính năng này ra mắt.
              </p>
            </section>
          </div>
          {count > 0 && (
            <p className="owned">
              Trong túi: <b>×{fullCount(count)}</b>
            </p>
          )}
        </div>
      </article>
    </ItemCardStyle>
  )
}

export default function ItemDialog({ id, count, onClose }: Props) {
  const ref = useModal(Boolean(id), onClose)
  return (
    <ItemDialogStyle ref={ref} aria-labelledby="quiz-item-name">
      {id && (
        <ItemCard
          id={id}
          count={count}
          headingId="quiz-item-name"
          onClose={() => ref.current?.close()}
        />
      )}
    </ItemDialogStyle>
  )
}
