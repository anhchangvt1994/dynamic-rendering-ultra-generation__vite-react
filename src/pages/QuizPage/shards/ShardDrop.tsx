import styled from 'styled-components'
import AmberCard from 'pages/BagPage/crafting/AmberCard'
import type { ShardClaim } from './client'

const Drop = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 124px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 10px 14px 10px 10px;
  border-radius: 20px;
  background: linear-gradient(100deg, #3a2406 0, #0b1830 70%);
  box-shadow:
    inset 0 0 0 2px #ffc24a99,
    0 14px 30px -14px #ffb43a;
  color: #fff;
  overflow: hidden;
  isolation: isolate;
  animation: shard-in 560ms cubic-bezier(0.2, 1.3, 0.4, 1) 120ms both;

  .shard-stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 124px;
    border-radius: 16px;
    background:
      radial-gradient(circle at 50% 60%, #ffcf6acc, #ffb43a55 45%, transparent 75%),
      #1a2a48;
    overflow: hidden;
  }
  .shard-stage > span {
    width: 116px;
  }
  /* the stone waiting for its pieces: lit, not dimmed */
  .shard-stage > span > svg {
    filter: brightness(1.25) saturate(1.1);
  }
  .shard-stage .amber-ghost {
    fill: #ffd98a38;
    stroke: #ffe3a8cc;
    stroke-width: 0.6;
    animation: none;
  }
  .shard-pillar {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 56px;
    height: 100%;
    margin-left: -28px;
    background: linear-gradient(to top, #fff, #ffd25a 30%, transparent);
    filter: blur(6px);
    transform-origin: 50% 100%;
    animation: shard-pillar 900ms ease-out 200ms both;
  }
  .shard-text {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  .shard-kicker {
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #ffc24a;
  }
  .shard-name {
    font-size: 17px;
    font-weight: 800;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .shard-count {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.78);
  }
  .shard-count b {
    font-size: 17px;
    color: #ffe08a;
  }
  @keyframes shard-in {
    0% {
      opacity: 0;
      transform: translateY(14px) scale(0.94);
    }
    100% {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes shard-pillar {
    0% {
      opacity: 0;
      transform: scaleY(0.1);
    }
    35% {
      opacity: 0.95;
      transform: scaleY(1);
    }
    100% {
      opacity: 0;
      transform: scaleY(1) scaleX(1.8);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    .shard-pillar {
      display: none;
    }
  }
`

/** A shard that just fell out of the answer: it drops onto its stone. */
export default function ShardDrop({
  claim,
  name,
}: {
  claim: ShardClaim | null
  name: string
}) {
  if (claim?.kind !== 'receipt' || claim.receipt.state !== 'awarded')
    return null
  const { speciesId, count, required } = claim.receipt
  return (
    <Drop key={claim.receipt.roundId} aria-hidden="true">
      <div className="shard-stage">
        <i className="shard-pillar" />
        <AmberCard
          speciesId={speciesId}
          name={name}
          count={count}
          required={required ?? Math.max(count, 1)}
          fresh
        />
      </div>
      <div className="shard-text">
        <span className="shard-kicker">Mảnh hổ phách</span>
        <span className="shard-name">{name}</span>
        <span className="shard-count">
          <b>{count}</b>
          {required ? `/${required}` : ''} mảnh
        </span>
      </div>
    </Drop>
  )
}
