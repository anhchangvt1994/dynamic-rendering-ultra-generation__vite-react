import styled from 'styled-components'
import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import { TIERS, isValuable, itemById, itemSprite } from './items.mjs'
import Flavors from './Flavors'

type Props = {
  id: string
  /** a turn came back with it */
  bonus: boolean
  /** a wrong answer: the gift that got away, in ash */
  missed?: boolean
  onOpen: (id: string) => void
}

// when the card lands: after the reveal, as the gift flies over from the fuse
const LAND = '0.85s'

/*
 * The round's prize: a card that turns over on a pillar of light in its
 * tier's colour, the sprite dropping onto it. Rare cards are foiled. A tap
 * opens the item's card (ItemDialog).
 */
const LootStyle = styled.button`
  position: relative;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 10px 44px 10px 10px;
  border: none;
  border-radius: 20px;
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--tier) 24%, #0b1830) 0,
    #0b1830 70%
  );
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--tier) 75%, transparent),
    0 14px 30px -14px var(--tier);
  color: #fff;
  font: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transform-origin: 50% 100%;
  animation: loot-in 640ms cubic-bezier(0.2, 1.3, 0.4, 1) ${LAND} both;

  /* the foil: a slanted sheen crosses the card edge to edge, then rests */
  &[data-valuable]::after {
    content: '';
    position: absolute;
    top: -20%;
    bottom: -20%;
    left: 0;
    z-index: 2;
    width: 40%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3) 42%,
      color-mix(in srgb, var(--tier) 40%, transparent) 55%,
      transparent
    );
    mix-blend-mode: screen;
    pointer-events: none;
    transform: translateX(-130%) skewX(-16deg);
    animation: loot-foil 3.6s cubic-bezier(0.45, 0.05, 0.35, 1)
      calc(${LAND} + 0.5s) infinite;
  }
  &:hover {
    box-shadow:
      inset 0 0 0 2px var(--tier),
      0 16px 34px -12px var(--tier);
  }
  &:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  .loot-stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 88px;
    border-radius: 14px;
    background:
      radial-gradient(
        circle at 50% 75%,
        color-mix(in srgb, var(--tier) 55%, transparent),
        transparent 65%
      ),
      #06101f;
    overflow: hidden;
  }
  .loot-rays {
    position: absolute;
    inset: -50%;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--tier) 45%, transparent) 0 9deg,
      transparent 9deg 22deg
    );
    animation: loot-spin 9s linear infinite;
  }
  /* the pillar of light the gift lands in */
  .loot-pillar {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 46px;
    height: 100%;
    margin-left: -23px;
    background: linear-gradient(
      to top,
      #fff,
      color-mix(in srgb, var(--tier) 80%, #fff) 30%,
      transparent
    );
    filter: blur(6px);
    transform-origin: 50% 100%;
    animation: loot-pillar 1.1s ease-out ${LAND} both;
  }
  .loot-sprite {
    position: relative;
    width: 60px;
    height: 60px;
    image-rendering: pixelated;
    filter: drop-shadow(0 5px 0 rgba(0, 0, 0, 0.35));
    animation:
      loot-drop 520ms cubic-bezier(0.3, 1.6, 0.5, 1) calc(${LAND} + 0.15s) both,
      loot-float 2.4s ease-in-out calc(${LAND} + 0.7s) infinite;
  }
  .loot-text {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .loot-kicker {
    overflow-wrap: anywhere;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tier);
  }
  /* the whole name, on two lines if it must */
  .loot-name {
    font-family: var(--font-display);
    font-size: 21px;
    line-height: 1.05 !important;
    text-transform: uppercase;
    overflow-wrap: anywhere;
  }
  .loot-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .loot-stats span {
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }
  .loot-stats b {
    color: var(--tier);
  }
  .loot-more {
    position: absolute;
    right: 12px;
    top: 50%;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin-top: -12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    font-size: 13px;
    font-weight: 900;
    font-style: normal;
  }
  .loot-bonus {
    position: absolute;
    left: 4px;
    top: 6px;
    z-index: 3;
    padding: 3px 8px;
    border-radius: 999px;
    background: #e5483b;
    font-size: 11px;
    font-weight: 900;
    box-shadow:
      0 0 0 2px #14161a,
      0 0 14px rgba(255, 90, 74, 0.9);
    rotate: -8deg;
    animation: loot-stamp 460ms cubic-bezier(0.3, 1.6, 0.4, 1)
      calc(${LAND} + 0.6s) both;
  }

  /* the one that got away: in ash, no light */
  &[data-missed] {
    background: #0d1524;
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.12);
    animation-delay: 0.3s;
  }
  &[data-missed] .loot-stage {
    background: #070c16;
  }
  &[data-missed] .loot-rays,
  &[data-missed] .loot-pillar {
    display: none;
  }
  &[data-missed] .loot-sprite {
    filter: grayscale(1) brightness(0.6);
    animation: none;
  }
  &[data-missed] .loot-kicker {
    color: rgba(255, 255, 255, 0.55);
  }
  &[data-missed] .loot-name {
    font-size: 17px;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: line-through;
    text-decoration-thickness: 3px;
    text-decoration-color: var(--lose, #e5483b);
  }
  &[data-missed] .loot-stats b {
    color: rgba(255, 255, 255, 0.7);
  }

  @keyframes loot-in {
    0% {
      opacity: 0;
      transform: perspective(700px) rotateX(70deg) translateY(30px);
    }
    100% {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes loot-foil {
    0% {
      transform: translateX(-130%) skewX(-16deg);
    }
    45%,
    100% {
      transform: translateX(360%) skewX(-16deg);
    }
  }
  @keyframes loot-spin {
    to {
      rotate: 360deg;
    }
  }
  @keyframes loot-pillar {
    0% {
      opacity: 0;
      scale: 0.3 0;
    }
    30% {
      opacity: 1;
      scale: 1.4 1;
    }
    100% {
      opacity: 0.35;
      scale: 0.8 1;
    }
  }
  @keyframes loot-drop {
    from {
      opacity: 0;
      transform: translateY(-50px) scale(1.6);
    }
  }
  @keyframes loot-float {
    50% {
      translate: 0 -4px;
    }
  }
  @keyframes loot-stamp {
    from {
      opacity: 0;
      transform: scale(2.4);
    }
  }
  @media (max-width: 359px) {
    grid-template-columns: 70px minmax(0, 1fr);
    gap: 10px;
    .loot-kicker {
      font-size: 10px;
      letter-spacing: 0.03em;
    }
    .loot-stage {
      height: 70px;
    }
    .loot-sprite {
      width: 48px;
      height: 48px;
    }
    .loot-name {
      font-size: 19px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    &::after,
    * {
      animation: none !important;
    }
  }
`

const Loot = forwardRef<HTMLImageElement, Props>(function Loot(
  { id, bonus, missed = false, onOpen },
  spriteRef
) {
  const item = itemById(id)
  const tier = TIERS[item.tier]
  return (
    <LootStyle
      type="button"
      className="loot"
      data-valuable={(!missed && isValuable(item)) || undefined}
      data-missed={missed || undefined}
      onClick={() => onOpen(id)}
      style={{ '--tier': tier.color } as CSSProperties}
    >
      <span className="loot-stage" aria-hidden="true">
        <span className="loot-rays" />
        <span className="loot-pillar" />
        <img
          ref={spriteRef}
          className="loot-sprite"
          src={itemSprite(id)}
          alt=""
          width={30}
          height={30}
        />
      </span>
      <span className="loot-text">
        <span className="loot-kicker">
          {missed ? 'Bỏ lỡ ' : ''}
          {'★'.repeat(item.tier)}
          {missed ? '' : ` ${tier.label}`}
        </span>
        <strong className="loot-name">
          <span className="sr-only">
            {missed ? 'Quà bỏ lỡ: ' : 'Quà nhận được: '}
          </span>
          {item.name}
        </strong>
        <Flavors id={id} className="loot-flavors" />
        <span className="loot-stats">
          {item.stats.slice(0, 2).map(([label, value]: [string, string]) => (
            <span key={label}>
              {label} <b>{value}</b>
            </span>
          ))}
        </span>
      </span>
      <i className="loot-more" aria-hidden="true">
        i
      </i>
      {bonus && <span className="loot-bonus">+1 lượt</span>}
      <span className="sr-only">. Xem chi tiết vật phẩm</span>
    </LootStyle>
  )
})

export default Loot
