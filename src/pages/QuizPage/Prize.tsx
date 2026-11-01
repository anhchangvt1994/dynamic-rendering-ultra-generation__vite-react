import styled from 'styled-components'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject } from 'react'
import {
  ITEMS,
  SLOT_AT,
  TIERS,
  itemById,
  itemSprite,
  slotFor,
} from './items.mjs'

type Props = {
  gifts: string[]
  /** the gift that also gives a turn back (-1: none) */
  bonus: number
  result: 'live' | 'won' | 'lost'
  won: number
  /** the veil left (1 → 0), written every frame by Veil.tsx */
  remainingRef: MutableRefObject<number>
  /** the gift on offer dropped to the next one */
  onDrop: (tier: number) => void
}

/** How much of its time the gift on offer has left (1 → 0). */
const timeLeft = (k: number, slot: number) => {
  if (slot < 0) return 0
  const top = slot === 0 ? 1 : SLOT_AT[slot - 1]
  return Math.min(1, Math.max(0, (k - SLOT_AT[slot]) / (top - SLOT_AT[slot])))
}

/*
 * The prize: one gift at a time, in an orb hanging from the stage's bottom
 * edge, a ring around it running out. When it runs out the gift falls out
 * of the orb and a lesser one rolls in, like a slot machine going down a
 * notch: the earlier the guess, the better the prize. The dots under it
 * are the drops left. A right answer launches the orb's gift to its card.
 */
const PrizeStyle = styled.div`
  --orb: clamp(76px, 22cqw, 104px);
  position: relative;
  z-index: 6;
  display: grid;
  justify-items: center;
  gap: 6px;
  margin-top: calc(var(--orb) / -2);
  pointer-events: none;
  transition:
    margin 400ms ease-out 900ms,
    opacity 300ms ease-out 900ms;

  .prize-orb {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--orb);
    height: var(--orb);
    border-radius: 50%;
    background:
      radial-gradient(
        circle at 50% 62%,
        color-mix(in srgb, var(--tier) 55%, transparent),
        transparent 62%
      ),
      radial-gradient(circle at 50% 30%, #1d3a66, #071225 75%);
    box-shadow:
      0 0 0 4px #071225,
      0 0 0 6px color-mix(in srgb, var(--tier) 60%, #fff),
      0 10px 24px rgba(0, 0, 0, 0.55),
      0 0 34px color-mix(in srgb, var(--tier) 45%, transparent);
    transition: box-shadow 400ms ease-out;
  }
  /* the time left, as a ring that empties clockwise */
  .prize-ring {
    position: absolute;
    inset: -11px;
    border-radius: 50%;
    background: conic-gradient(
      var(--tier) calc(var(--left, 1) * 1turn),
      rgba(255, 255, 255, 0.12) 0
    );
    -webkit-mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 6px),
      #000 calc(100% - 5px)
    );
    mask: radial-gradient(
      farthest-side,
      transparent calc(100% - 6px),
      #000 calc(100% - 5px)
    );
    filter: drop-shadow(0 0 6px var(--tier));
  }
  &[data-urgent] .prize-ring {
    animation: prize-urgent 380ms steps(2, end) infinite;
  }
  /* the glass, a highlight across its top */
  .prize-orb::after {
    content: '';
    position: absolute;
    inset: 5% 22% 70%;
    border-radius: 50%;
    background: linear-gradient(rgba(255, 255, 255, 0.22), transparent);
    pointer-events: none;
  }
  .prize-core {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 50%;
    animation: prize-hit 420ms ease-out;
  }
  .prize-core > * {
    grid-area: 1 / 1;
  }
  .prize-rays {
    width: 170%;
    height: 170%;
    background: repeating-conic-gradient(
      from 0deg,
      color-mix(in srgb, var(--tier) 55%, transparent) 0 8deg,
      transparent 8deg 24deg
    );
    -webkit-mask: radial-gradient(circle, #000 12%, transparent 60%);
    mask: radial-gradient(circle, #000 12%, transparent 60%);
    opacity: 0;
    animation: prize-spin 8s linear infinite;
  }
  &[data-tier='3'] .prize-rays {
    opacity: 0.6;
  }
  &[data-tier='4'] .prize-rays {
    opacity: 1;
  }
  .prize-gem {
    width: 62%;
    height: 62%;
    image-rendering: pixelated;
    /* a sticker: a white rim lifts the pixel art off the glass */
    filter: drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff)
      drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff)
      drop-shadow(0 4px 3px rgba(0, 0, 0, 0.6));
    animation:
      prize-in 560ms cubic-bezier(0.3, 1.5, 0.5, 1) both,
      prize-float 2.4s ease-in-out 600ms infinite;
  }
  /* the gift that ran out, falling away greyed */
  .prize-drop {
    position: absolute;
    left: 19%;
    top: 19%;
    width: 62%;
    height: 62%;
    image-rendering: pixelated;
    animation: prize-drop 640ms ease-in forwards;
  }
  /* legendary: stars twinkle on the glass */
  &[data-tier='4'] .prize-orb::before {
    content: '';
    position: absolute;
    z-index: 2;
    left: 10%;
    top: 14%;
    width: 18%;
    height: 18%;
    background: #fff;
    clip-path: polygon(
      50% 0,
      62% 38%,
      100% 50%,
      62% 62%,
      50% 100%,
      38% 62%,
      0 50%,
      38% 38%
    );
    animation: prize-twinkle 1.4s ease-in-out infinite;
  }
  .prize-bonus {
    position: absolute;
    z-index: 3;
    right: -16px;
    top: -6px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px 3px 4px;
    border-radius: 999px;
    background: #e5483b;
    color: #fff;
    font-size: 11px;
    font-style: normal;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    box-shadow:
      0 0 0 2px #071225,
      0 0 14px rgba(255, 90, 74, 0.9);
    rotate: 12deg;
    animation: prize-badge 1.2s ease-in-out infinite;
  }
  .prize-bonus::before {
    content: '';
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: linear-gradient(#ff5b4a 0 44%, #14161a 44% 58%, #fff 58%);
    box-shadow: 0 0 0 1px #14161a;
  }
  .prize-label {
    display: flex;
    align-items: center;
    gap: 7px;
    max-width: 100%;
    margin: 0;
    padding: 4px 12px 5px;
    border-radius: 999px;
    background: #071225;
    box-shadow: inset 0 0 0 1.5px
      color-mix(in srgb, var(--tier) 70%, transparent);
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    animation: prize-label 380ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .prize-label b {
    color: var(--tier);
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  /* the drops left */
  .prize-dots {
    display: flex;
    gap: 3px;
  }
  .prize-dots i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--tier);
  }
  .prize-dots i[data-gone] {
    background: none;
    box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.3);
  }

  &[data-result='idle'] {
    --tier: #5b7aa8;
  }
  &[data-result='idle'] .prize-ring {
    animation: prize-spin 2s linear infinite;
    background: conic-gradient(var(--tier) 0 25%, rgba(255, 255, 255, 0.1) 0);
  }
  &[data-result='idle'] .prize-label {
    color: rgba(255, 255, 255, 0.6);
  }
  /* the reel: gifts whirling down, blurred by speed */
  .prize-reel {
    position: absolute;
    left: 50%;
    top: 0;
    display: grid;
    gap: 14px;
    justify-items: center;
    transform: translateX(-50%);
    filter: blur(1.2px) drop-shadow(0 0 6px rgba(255, 255, 255, 0.35));
    animation: prize-reel 900ms linear infinite;
  }
  .prize-reel img {
    width: 30px;
    height: 30px;
    image-rendering: pixelated;
  }
  .prize-dots-label {
    display: flex;
    gap: 6px;
    justify-content: center;
  }
  .prize-dots-label i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.55);
    animation: prize-blink 900ms ease-in-out infinite;
  }
  .prize-dots-label i:nth-child(2) {
    animation-delay: 150ms;
  }
  .prize-dots-label i:nth-child(3) {
    animation-delay: 300ms;
  }
  .prize-dots-label i:nth-child(4) {
    animation-delay: 450ms;
  }
  /* the reel stops on the round's first gift: a jolt, a flash of its tier
     (on the orb: the core comes back with every gift dropped) */
  &[data-result='live'] .prize-orb {
    animation: prize-land 640ms cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  @keyframes prize-reel {
    from {
      transform: translate(-50%, -50%);
    }
    to {
      transform: translate(-50%, 0);
    }
  }
  @keyframes prize-blink {
    50% {
      opacity: 0.25;
    }
  }
  @keyframes prize-land {
    0% {
      transform: translateY(-6px) scale(0.92);
      filter: brightness(2.2) drop-shadow(0 0 16px var(--tier));
    }
    45% {
      transform: translateY(2px) scale(1.06);
    }
    70% {
      transform: rotate(-3deg);
    }
    100% {
      transform: none;
    }
  }

  /* the round is over */
  &[data-result='won'] .prize-orb {
    animation: prize-win 900ms cubic-bezier(0.2, 0.9, 0.3, 1) var(--burst, 0s)
      forwards;
  }
  &[data-result='lost'] .prize-orb {
    filter: grayscale(1) brightness(0.7);
    animation: prize-lost 600ms ease-in var(--burst, 0s) forwards;
  }
  &[data-result='won'] .prize-label,
  &[data-result='lost'] .prize-label {
    animation: prize-fade 300ms ease-out forwards;
  }
  /* then the room it took closes up */
  &[data-result='won'],
  &[data-result='lost'] {
    margin-bottom: calc(var(--orb) / -2 - 40px);
    opacity: 0;
  }

  @keyframes prize-urgent {
    50% {
      filter: drop-shadow(0 0 12px #fff) brightness(1.6);
    }
  }
  @keyframes prize-hit {
    0% {
      scale: 0.86;
      filter: brightness(2.2);
    }
    50% {
      scale: 1.06;
    }
  }
  @keyframes prize-spin {
    to {
      rotate: 360deg;
    }
  }
  @keyframes prize-in {
    from {
      opacity: 0;
      transform: translateY(-110%) rotate(-40deg) scale(0.5);
    }
  }
  @keyframes prize-float {
    50% {
      translate: 0 -4px;
    }
  }
  @keyframes prize-drop {
    0% {
      filter: brightness(2.5) saturate(0);
    }
    100% {
      opacity: 0;
      transform: translateY(150%) rotate(70deg) scale(0.6);
      filter: grayscale(1) brightness(0.5);
    }
  }
  @keyframes prize-twinkle {
    0%,
    100% {
      scale: 0.3;
      opacity: 0.2;
    }
    50% {
      scale: 1;
      opacity: 1;
    }
  }
  @keyframes prize-badge {
    50% {
      scale: 1.12;
    }
  }
  @keyframes prize-label {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.85);
    }
  }
  @keyframes prize-win {
    0% {
      scale: 1;
    }
    30% {
      scale: 1.3;
      filter: brightness(1.6);
    }
    100% {
      scale: 0.4;
      opacity: 0;
    }
  }
  @keyframes prize-lost {
    30% {
      translate: -4px 0;
    }
    60% {
      translate: 4px 0;
    }
    100% {
      scale: 0.6;
      opacity: 0;
    }
  }
  @keyframes prize-fade {
    to {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`

/** The orb, empty, while a round loads (and in the page's skeleton). */
// the reel's faces: the best of each tier, then commons
const REEL = [4, 3, 2, 1, 1, 1].map(
  (tier, i) => ITEMS.filter((item) => item.tier === tier)[i < 3 ? 0 : i - 3].id
)

/**
 * While the round comes: a slot machine in the orb, gifts whirling past.
 * The Prize that replaces it lands on the round's first gift (prize-land).
 */
export function PrizeSlot() {
  return (
    <PrizeStyle className="prize" data-result="idle" aria-hidden="true">
      <span className="prize-orb">
        <span className="prize-ring" />
        <span className="prize-core">
          <span className="prize-reel">
            {[...REEL, ...REEL].map((id, i) => (
              <img
                key={i}
                src={itemSprite(id)}
                alt=""
                width={30}
                height={30}
                decoding="async"
                draggable={false}
              />
            ))}
          </span>
        </span>
      </span>
      <p className="prize-label prize-dots-label">
        <i />
        <i />
        <i />
        <i />
      </p>
    </PrizeStyle>
  )
}

export default function Prize({
  gifts,
  bonus,
  result,
  won,
  remainingRef,
  onDrop,
}: Props) {
  const [slot, setSlot] = useState(() => slotFor(remainingRef.current))
  const [dropped, setDropped] = useState<{ id: string; at: number } | null>(
    null
  )
  const rootRef = useRef<HTMLDivElement>(null)
  const drop = useRef(onDrop)
  drop.current = onDrop

  // NOTE - The ring follows the veil every frame (a CSS variable, no
  // render); only a drop to the next gift re-renders
  useEffect(() => {
    const root = rootRef.current
    if (!root || result !== 'live') return
    let current = slotFor(remainingRef.current)
    let frame = requestAnimationFrame(function tick() {
      const k = remainingRef.current
      const at = slotFor(k)
      const left = timeLeft(k, at)
      root.style.setProperty('--left', left.toFixed(3))
      if (left < 0.25 && at >= 0) root.dataset.urgent = ''
      else delete root.dataset.urgent
      if (at !== current) {
        const gone = current
        current = at
        if (gone >= 0) {
          setDropped({ id: gifts[gone], at: performance.now() })
          drop.current(itemById(gifts[gone]).tier)
        }
        setSlot(at)
      }
      frame = requestAnimationFrame(tick)
    })
    return () => {
      cancelAnimationFrame(frame)
      delete root.dataset.urgent
    }
  }, [result, gifts, remainingRef])

  const shown = result === 'won' ? won : slot < 0 ? gifts.length - 1 : slot
  const item = itemById(gifts[shown])
  const tier = TIERS[item.tier]

  return (
    <PrizeStyle
      ref={rootRef}
      className="prize"
      data-result={result}
      data-tier={item.tier}
      aria-hidden="true"
      style={{ '--tier': tier.color } as CSSProperties}
    >
      <span className="prize-orb">
        <span className="prize-ring" />
        <span key={shown} className="prize-core">
          <span className="prize-rays" />
          <img
            className="prize-gem"
            src={itemSprite(gifts[shown])}
            alt=""
            width={30}
            height={30}
            decoding="async"
            draggable={false}
          />
          {dropped && (
            <img
              key={dropped.at}
              className="prize-drop"
              src={itemSprite(dropped.id)}
              alt=""
              width={30}
              height={30}
            />
          )}
        </span>
        {bonus === shown && result !== 'lost' && (
          <i className="prize-bonus">+1 lượt</i>
        )}
      </span>
      <p key={`label-${shown}`} className="prize-label">
        <span className="prize-dots">
          {gifts.map((id, index) => (
            <i key={id} data-gone={index < shown || undefined} />
          ))}
        </span>
        <b>{tier.label}</b>
        {item.name}
      </p>
    </PrizeStyle>
  )
}
