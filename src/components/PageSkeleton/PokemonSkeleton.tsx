import styled from 'styled-components'
import { boneCss } from './bone'

// The class `pokemon-page` switches the shell and the header to the dark
// field world (ContentStyle / HeaderStyle use :has(.pokemon-page)), so the
// first paint already has the right colours. Column: 640px like BodyStyle.
const PokemonSkeletonStyle = styled.div`
  ${boneCss}
  .column {
    max-width: 640px;
    margin: 0 auto;
  }
  .back {
    width: 92px;
    height: 44px;
    border-radius: 11px;
  }
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    height: 196px;
    margin-top: 20px;
  }
  .dex {
    position: absolute;
    top: 14px;
    width: 220px;
    height: 64px;
    border-radius: 14px;
    opacity: 0.6;
  }
  .mon {
    position: relative;
    width: 128px;
    height: 128px;
    margin-bottom: 24px;
  }
  /* the glowing pad the Pokémon stands on */
  .pad {
    position: absolute;
    bottom: 14px;
    width: 150px;
    height: 30px;
    border-radius: 50%;
    background: radial-gradient(
      closest-side,
      rgba(255, 218, 85, 0.45),
      rgba(255, 218, 85, 0.12) 70%,
      transparent
    );
    animation: pad-glow 1.6s ease-in-out infinite alternate;
  }
  @keyframes pad-glow {
    to {
      opacity: 0.45;
    }
  }
  .name {
    width: 210px;
    height: 40px;
    margin: 7px auto 6px;
  }
  .type {
    width: 74px;
    height: 26px;
    margin: 0 auto;
  }
  .actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
  }
  .actions .bone {
    width: 82px;
    height: 44px;
  }
  .card {
    margin-top: 16px;
    border-radius: 14px;
  }
  /* most Pokémon have no alternate forms: no form row before it */
  .power {
    height: 86px;
    margin-top: 25px;
  }
  .entry {
    height: 196px;
  }
  .stats {
    height: 320px;
  }
  @media (max-width: 680px) {
    .actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
    .actions .bone {
      width: auto;
      height: 56px;
      border-radius: 18px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pad {
      animation: none;
    }
  }
`

export default function PokemonSkeleton() {
  return (
    <PokemonSkeletonStyle
      className="pokemon-page pokemon-skeleton"
      data-tone="dark"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Đang mở trang Pokémon…</span>
      <div className="column" aria-hidden="true">
        <span className="bone back" />
        <div className="stage">
          <span className="bone dex" />
          <span className="pad" />
          <span className="bone bone--round mon" />
        </div>
        <span className="bone name" />
        <span className="bone bone--pill type" />
        <div className="actions">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="bone bone--pill" />
          ))}
        </div>
        <span className="bone card power" />
        <span className="bone card entry" />
        <span className="bone card stats" />
      </div>
    </PokemonSkeletonStyle>
  )
}
