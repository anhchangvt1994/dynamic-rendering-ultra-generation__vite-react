import type { CSSProperties, ReactNode } from 'react'
import styled from 'styled-components'

/*
 * System states (404, errors, empty lists) told as a Pokémon battle text box:
 * a white double-ruled panel, the line typing itself out, a blinking ▼ and
 * a Poké Ball rocking above it. Every state names what happened and offers
 * one way forward.
 */
const BattleMessageStyle = styled.section`
  display: grid;
  justify-items: center;
  gap: 20px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 48px 4px 24px;

  .ball {
    width: 64px;
    height: 64px;
    filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
    transform-origin: 50% 85%;
    animation: battle-catch 1.8s ease-in-out infinite;
  }

  .box {
    position: relative;
    width: 100%;
    padding: 18px 20px 22px;
    border-radius: 10px;
    background: #f8f8f0;
    color: #1d2230;
    /* the double rule of the in-game text box */
    box-shadow:
      inset 0 0 0 3px #f8f8f0,
      inset 0 0 0 6px #3c4a6b,
      0 10px 24px rgba(0, 0, 0, 0.35);
  }
  .title {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.45 !important;
    /* types itself out, one character at a time */
    white-space: nowrap;
    animation: battle-type calc(var(--chars) * 35ms) steps(var(--chars), end)
      both;
  }
  .text {
    margin: 8px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: #3a4256;
    animation: battle-fade 300ms ease-out calc(var(--chars) * 35ms) both;
  }
  .box::after {
    content: '▼';
    position: absolute;
    right: 18px;
    bottom: 10px;
    font-size: 11px;
    color: #e3350d;
    animation: battle-blink 0.9s steps(1, end) infinite;
  }

  .action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 22px;
    border: none;
    border-radius: 999px;
    background: #e3350d;
    color: #fff;
    font: inherit;
    font-weight: 700;
    box-shadow: 0 3px 0 #a3220a;
    cursor: pointer;
    transition:
      transform 120ms ease-out,
      box-shadow 120ms ease-out;
  }
  .action:active {
    transform: translateY(3px);
    box-shadow: 0 0 0 #a3220a;
  }
  .action:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 3px;
  }

  @keyframes battle-catch {
    0%,
    50%,
    100% {
      rotate: 0deg;
    }
    60% {
      rotate: -18deg;
    }
    70% {
      rotate: 14deg;
    }
    80% {
      rotate: -6deg;
    }
  }
  @keyframes battle-type {
    from {
      clip-path: inset(0 100% 0 0);
    }
    to {
      clip-path: inset(0 0 0 0);
    }
  }
  @keyframes battle-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes battle-blink {
    50% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ball,
    .title,
    .text,
    .box::after {
      animation: none;
    }
  }
`

const PokeBall = () => (
  <svg className="ball" viewBox="0 0 100 100" aria-hidden="true">
    <circle
      cx="50"
      cy="50"
      r="46"
      fill="#f4f4f4"
      stroke="#222"
      strokeWidth="6"
    />
    <path
      d="M4 50a46 46 0 0 1 92 0z"
      fill="#e3350d"
      stroke="#222"
      strokeWidth="6"
    />
    <path d="M4 50h92" stroke="#222" strokeWidth="6" />
    <circle
      cx="50"
      cy="50"
      r="13"
      fill="#f4f4f4"
      stroke="#222"
      strokeWidth="6"
    />
    <circle cx="50" cy="50" r="5" fill="#fff" stroke="#222" strokeWidth="3" />
  </svg>
)

type Action =
  | { label: string; to: string; onClick?: never }
  | { label: string; onClick: () => void; to?: never }

export default function BattleMessage({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: Action
}) {
  return (
    <BattleMessageStyle>
      <PokeBall />
      <div
        className="box"
        style={{ '--chars': [...title].length } as CSSProperties}
      >
        <h1 className="title">{title}</h1>
        {children && <p className="text">{children}</p>}
      </div>
      {action &&
        (action.to !== undefined ? (
          <LinkCustom className="action" to={action.to}>
            {action.label}
          </LinkCustom>
        ) : (
          <button type="button" className="action" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </BattleMessageStyle>
  )
}
