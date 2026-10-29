export const PokemonCardStyle = styled(LinkCustom)`
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: white;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 14px 17px 16px;
  color: var(--ink);
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 170ms,
    border-color 170ms,
    box-shadow 170ms;
  &:hover {
    transform: translateY(-4px);
    border-color: #b5c6d5;
    box-shadow: 0 8px 20px #172d450d;
  }
  &:active {
    transform: scale(0.98);
  }
  &[data-caught='true'] {
    border-color: #b6d9c7;
  }
  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 20px;
  }
  .card-arrow {
    font-size: 16px;
    color: #8a9bad;
  }
  .caught-mark {
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--mint);
    color: #275d42;
  }
  .card-art {
    display: grid;
    place-items: center;
    height: 142px;
    position: relative;
    margin-top: 5px;
  }
  .card-art img {
    position: relative;
    width: 160px;
    height: 142px;
    object-fit: contain;
    transition: transform 230ms cubic-bezier(0.2, 0.7, 0.3, 1);
    filter: drop-shadow(0 8px 5px #172d4512);
  }
  .card-art > svg {
    width: 30px;
    height: 30px;
    opacity: 0.5;
  }
  /* halo in the Pokémon's type colours, split diagonally for dual types */
  .card-orbit {
    position: absolute;
    width: 104px;
    height: 104px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--t1, #9fa19f) 22%, #fff) 50%,
      color-mix(in srgb, var(--t2, #9fa19f) 22%, #fff) 50%
    );
    box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--t1, #9fa19f) 18%, transparent);
    transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  &:hover .card-orbit,
  &:focus-visible .card-orbit {
    transform: scale(1.08);
  }
  /* type colour runs along the card's top edge */
  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 3px;
    background: linear-gradient(90deg, var(--t1) 50%, var(--t2) 50%);
    opacity: 0.85;
  }
  .card-types {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
  }
  .type-pill {
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--type) 14%, #fff);
    /* ≥5:1 for every type (Điện is the worst case) */
    color: color-mix(in srgb, var(--type) 55%, #111);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.6 !important;
  }
  .card-types .card-region {
    margin: 0 0 0 auto;
  }
  &:hover img,
  &:focus-visible img {
    transform: translateY(-5px) rotate(-3deg) scale(1.04);
  }
  .card-bottom {
    position: relative;
    margin-top: 9px;
  }
  .card-region {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 11px;
    margin-top: 5px;
  }
  .card-region i {
    width: 3px;
    height: 3px;
    background: #a7b5bf;
    border-radius: 50%;
  }
  @media (max-width: 680px) {
    padding: 10px 12px 13px;
    border-radius: 14px;
    .card-art {
      height: 115px;
      margin-top: 1px;
    }
    .card-art img {
      width: 128px;
      height: 115px;
    }
    .card-orbit {
      width: 86px;
      height: 86px;
    }
    .card-region {
      font-size: 11px;
      gap: 5px;
      margin-top: 4px;
    }
    .card-bottom {
      margin-top: 5px;
    }
    .card-arrow {
      font-size: 14px;
    }
  }
`
export const NameStyle = styled.h3`
  color: var(--ink);
  font-weight: 800;
  font-size: 16px;
  letter-spacing: -0.4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  @media (max-width: 680px) {
    font-size: 13px;
    letter-spacing: -0.2px;
  }
`
export const DexStyle = styled.span`
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
  letter-spacing: 0.3px;
  @media (max-width: 680px) {
    font-size: 11px;
  }
`
export const PokemonCardLoadingStyle = styled.div`
  min-height: 202px;
  border: 1px solid var(--line);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: white;
  color: var(--muted);
  .image-wrapper {
    height: 32px;
    width: 32px;
  }
  .image {
    height: 32px;
    width: 32px;
    object-fit: contain;
  }
`
export const NameLoadingStyle = styled.div`
  height: 12px;
  width: 45%;
  background: var(--canvas);
  border-radius: 5px;
  margin-top: 14px;
`
