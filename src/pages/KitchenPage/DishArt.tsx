import styled from 'styled-components'
import type { CSSProperties, ReactNode } from 'react'
import { STATS } from './kitchen.mjs'
import type { StatKey } from './engine/types'

type Props = {
  kind: string
  /** the dish's strongest stats: their flavours colour it */
  top: StatKey[]
  /** a secret not found yet: a black silhouette ("Who's that dish?") */
  secret?: boolean
  size?: number
  /** steam rises from a fresh dish */
  steam?: boolean
  className?: string
}

const INK = '#172d45'

// a kawaii face: eyes, a smile, blush
const Face = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g className="face" transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="-9" cy="0" rx="2.6" ry="3.4" fill={INK} />
    <ellipse cx="9" cy="0" rx="2.6" ry="3.4" fill={INK} />
    <circle cx="-8.2" cy="-1.2" r="0.9" fill="#fff" />
    <circle cx="9.8" cy="-1.2" r="0.9" fill="#fff" />
    <path
      d="M-3 4q3 3 6 0"
      fill="none"
      stroke={INK}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <ellipse
      className="blush"
      cx="-14"
      cy="5"
      rx="3.6"
      ry="2"
      fill="#ff8fb3"
      opacity="0.7"
    />
    <ellipse
      className="blush"
      cx="14"
      cy="5"
      rx="3.6"
      ry="2"
      fill="#ff8fb3"
      opacity="0.7"
    />
  </g>
)

const Plate = () => (
  <ellipse
    cx="60"
    cy="98"
    rx="46"
    ry="10"
    fill="#f6f1ff"
    stroke={INK}
    strokeWidth="3"
  />
)

// one drawing per kind; `a` is the main colour, `b` the second
const KINDS: Record<string, (a: string, b: string) => ReactNode> = {
  poffin: (a, b) => (
    <>
      <Plate />
      <path
        d="M22 88c0-26 16-42 38-42s38 16 38 42z"
        fill="#f3c98b"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M24 74c4-18 18-28 36-28s32 10 36 28c-6 4-10-4-15 2s-9 4-13-1-9 6-15 1-9-5-14 0-11 2-15-2z"
        fill={a}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="40" r="7" fill={b} stroke={INK} strokeWidth="3" />
      <path
        d="M60 33q2-8 8-9"
        fill="none"
        stroke="#3fa463"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Face x={60} y={80} s={0.9} />
    </>
  ),
  cake: (a, b) => (
    <>
      <Plate />
      <path
        d="M26 92V58h68v34z"
        fill="#fff4e2"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M26 72h68" stroke={a} strokeWidth="7" />
      <path
        d="M22 60c2-12 14-18 38-18s36 6 38 18c-5 6-9-2-13 4s-8 3-12-1-8 6-13 2-8-6-13-1-9 4-13 0-8-2-12-4z"
        fill={a}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="40" r="6" fill={b} stroke={INK} strokeWidth="2.5" />
      <circle cx="60" cy="34" r="7" fill={b} stroke={INK} strokeWidth="2.5" />
      <circle cx="76" cy="40" r="6" fill={b} stroke={INK} strokeWidth="2.5" />
      <Face x={60} y={84} s={0.85} />
    </>
  ),
  curry: (a) => (
    <>
      <path
        d="M14 66h92c0 22-20 34-46 34S14 88 14 66z"
        fill="#fff"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M20 66c4-16 18-24 36-22 8-10 30-8 36 6 6 2 9 8 8 16z"
        fill="#fffaf0"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M58 66c4-12 14-18 26-16s16 8 16 16z"
        fill={a}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle
        cx="74"
        cy="60"
        r="4"
        fill="#f3c98b"
        stroke={INK}
        strokeWidth="2"
      />
      <circle
        cx="86"
        cy="62"
        r="3.5"
        fill="#3fa463"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M96 40l14-16"
        stroke={INK}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M96 40l14-16"
        stroke="#c9d6e6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Face x={60} y={84} s={0.85} />
    </>
  ),
  smoothie: (a, b) => (
    <>
      <path
        d="M34 34h52l-7 64H41z"
        fill="#e9f6ff"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M37 50h46l-5 46H42z" fill={a} />
      <path
        d="M37 50c8 6 15-4 23 0s15 6 23 0"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        opacity="0.7"
      />
      <path
        d="M34 34h52l-7 64H41z"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M66 36l12-24h10"
        fill="none"
        stroke={b}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="44"
        cy="34"
        r="9"
        fill="#ffe14d"
        stroke={INK}
        strokeWidth="3"
      />
      <circle cx="48" cy="64" r="2.5" fill="#fff" opacity="0.8" />
      <circle cx="70" cy="80" r="2" fill="#fff" opacity="0.8" />
      <Face x={60} y={72} s={0.8} />
    </>
  ),
  jelly: (a, b) => (
    <>
      <Plate />
      <path
        className="wobble"
        d="M26 92c-2-30 10-52 34-52s36 22 34 52z"
        fill={a}
        fillOpacity="0.85"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M38 56c4-8 10-11 16-12"
        fill="none"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="60" cy="38" r="6" fill={b} stroke={INK} strokeWidth="2.5" />
      <Face x={60} y={74} s={0.9} />
    </>
  ),
  sandwich: (a, b) => (
    <>
      <Plate />
      <path
        d="M20 86l40-48 40 48z"
        fill="#f3c98b"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M26 80l34-40 34 40"
        fill="none"
        stroke={a}
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M30 76l30-34 30 34"
        fill="none"
        stroke={b}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M20 86l40-48 40 48z"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Face x={60} y={72} s={0.75} />
    </>
  ),
  soup: (a) => (
    <>
      <path
        d="M12 58h96c0 26-22 40-48 40S12 84 12 58z"
        fill="#fff"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse
        cx="60"
        cy="58"
        rx="48"
        ry="10"
        fill={a}
        stroke={INK}
        strokeWidth="3"
      />
      <circle cx="44" cy="57" r="4" fill="#fff" opacity="0.7" />
      <circle
        cx="74"
        cy="56"
        r="3"
        fill="#3fa463"
        stroke={INK}
        strokeWidth="1.5"
      />
      <Face x={60} y={80} s={0.85} />
    </>
  ),
  pudding: (a, b) => (
    <>
      <Plate />
      <path
        d="M32 92l6-46h44l6 46z"
        fill="#ffe7a3"
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 50c0-6 10-10 24-10s24 4 24 10c-4 6-8 0-12 4s-8 2-12-1-8 4-12 0-8-1-12-3z"
        fill={b}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="36" r="6" fill={a} stroke={INK} strokeWidth="2.5" />
      <Face x={60} y={74} s={0.85} />
    </>
  ),
}

/**
 * A dish, drawn: one of 8 kinds, cute (ink outline, a face, blush), tinted
 * by its 2 strongest flavours; a black silhouette while it is a secret.
 */
export default function DishArt({
  kind,
  top,
  secret = false,
  size = 96,
  steam = false,
  className,
}: Props) {
  const a = STATS[top[0] ?? 'friendship'].color
  const b = STATS[top[1] ?? top[0] ?? 'friendship'].color
  const draw = KINDS[kind] ?? KINDS.poffin
  return (
    <DishArtStyle
      className={['dish-art', className].filter(Boolean).join(' ')}
      data-secret={secret || undefined}
      style={{ '--size': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        {draw(a, b)}
        {steam && !secret && (
          <g
            className="steam"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
          >
            <path d="M46 26q-6-8 0-14" />
            <path d="M60 22q-6-8 0-14" />
            <path d="M74 26q-6-8 0-14" />
          </g>
        )}
      </svg>
    </DishArtStyle>
  )
}

const DishArtStyle = styled.span`
  display: inline-grid;
  place-items: center;
  width: var(--size);
  height: var(--size);
  filter: drop-shadow(0 6px 0 rgba(23, 45, 69, 0.18));

  svg {
    overflow: visible;
  }
  /* "Who's that dish?": all of it black, a cold rim */
  &[data-secret] svg {
    filter: brightness(0) drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.85))
      drop-shadow(0 0 10px rgba(160, 230, 255, 0.45));
  }
  .steam path {
    animation: dish-steam 2.4s ease-in-out infinite;
  }
  .steam path:nth-child(2) {
    animation-delay: 0.6s;
  }
  .steam path:nth-child(3) {
    animation-delay: 1.2s;
  }
  .wobble {
    transform-origin: 60px 92px;
    animation: dish-wobble 2.8s ease-in-out infinite;
  }
  @keyframes dish-steam {
    0% {
      opacity: 0;
      transform: translateY(6px);
    }
    40% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
      transform: translateY(-8px);
    }
  }
  @keyframes dish-wobble {
    0%,
    100% {
      transform: scale(1, 1);
    }
    50% {
      transform: scale(1.04, 0.96);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .steam path,
    .wobble {
      animation: none;
    }
  }
`
