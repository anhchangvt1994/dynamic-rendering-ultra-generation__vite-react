// A Pokédex entry: number, sprite, name, and a Poké Ball pressed into the
// corner; the Pokémon hops when the entry is hovered or focused.
export const PokemonCardStyle = styled(LinkCustom)`
  position: relative;
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 160ms cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 160ms ease-out;

  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    right: -18px;
    bottom: -18px;
    width: 76px;
    height: 76px;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none' stroke='white' stroke-width='6'%3E%3Ccircle cx='50' cy='50' r='46'/%3E%3Cpath d='M4 50h30M66 50h30'/%3E%3Ccircle cx='50' cy='50' r='15'/%3E%3C/svg%3E")
      center / contain no-repeat;
    opacity: 0.09;
  }

  &:hover,
  &:focus-visible {
    transform: translateY(-3px);
    box-shadow: 0 10px 22px rgba(0, 0, 0, 0.28);
  }
  &:hover .image-wrapper,
  &:focus-visible .image-wrapper {
    animation: card-hop 420ms cubic-bezier(0.3, 1.4, 0.5, 1);
  }
  &:active {
    transform: translateY(0) scale(0.97);
  }
  &:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 2px;
  }

  @keyframes card-hop {
    40% {
      transform: translateY(-10px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover .image-wrapper,
    &:focus-visible .image-wrapper {
      animation: none;
    }
  }

  display: inline-flex;
  flex: 0 0 calc(50% - 8px);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  background: -webkit-linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );
  background: linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );

  .image-wrapper {
    width: 100%;
    height: 88px;

    &::before,
    &::after {
      display: block;
      content: none;
      position: absolute;
      top: 0;
      left: 50%;
      width: 120px;
      height: 88px;
      transform: translateX(-50%);
      z-index: -1;
    }

    &::before {
      content: '';
      background: url('/images/pikachu-02.webp') no-repeat center center;
      background-size: contain;
    }

    &::after {
      background: url('/images/pokemon-02.webp') no-repeat center center;
      background-size: contain;
    }

    &:has(.show) {
      &::before {
        content: none;
      }
    }

    &:has(.error) {
      &::before {
        content: none;
      }
      &::after {
        content: '';
      }
    }
  }

  .image {
    object-fit: contain;
    /* 96px pixel sprites drawn at 2× stay crisp */
    image-rendering: pixelated;
  }
`

export const PokemonCardLoadingStyle = styled.div`
  display: inline-flex;
  flex: 0 0 calc(50% - 8px);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  background: -webkit-linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );
  background: linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );
`

export const NameStyle = styled.div`
  width: 100%;
  text-align: center;
  margin-top: 8px;
  font-family: 'Dela Gothic One', 'Be Vietnam Pro', sans-serif;
  font-size: 13px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  text-wrap: balance;
  color: #fff;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
`

export const DexStyle = styled.span`
  position: absolute;
  top: 8px;
  left: 10px;
  font-family: 'Dela Gothic One', sans-serif;
  font-size: 12px;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.6);
`

export const NameLoadingStyle = styled.div`
  width: 100%;
  height: 20px;
  text-align: center;
  margin-top: 8px;
  text-transform: capitalize;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .dot-flashing {
    position: relative;
    width: 10px;
    height: 10px;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    animation: dot-flashing 1s infinite linear alternate;
    animation-delay: 0.5s;
    border-radius: 0;
  }
  .dot-flashing::before,
  .dot-flashing::after {
    content: '';
    display: inline-block;
    position: absolute;
    top: 0;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    border-radius: 0;
  }
  .dot-flashing::before {
    left: -15px;
    width: 10px;
    height: 10px;
    animation: dot-flashing 1s infinite alternate;
    animation-delay: 0s;
  }
  .dot-flashing::after {
    left: 15px;
    width: 10px;
    height: 10px;
    animation: dot-flashing 1s infinite alternate;
    animation-delay: 1s;
  }

  @keyframes dot-flashing {
    0% {
      background-color: #e6f826;
    }
    50%,
    100% {
      background-color: rgba(240, 255, 128, 0.2);
    }
  }
`
