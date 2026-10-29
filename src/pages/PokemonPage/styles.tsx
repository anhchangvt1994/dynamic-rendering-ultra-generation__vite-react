export const PokemonPageStyle = styled.div`
  .swiper {
    height: 190px;
    touch-action: pan-y;
    mask-image: linear-gradient(
      to right,
      transparent,
      #000 5%,
      #000 95%,
      transparent
    );

    img {
      height: 150px;
      width: 100%;
      object-fit: contain;
      filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.18));
    }
  }

  .image-wrapper {
    display: flex;
    justify-content: center;
    height: 150px;
    padding-bottom: 0;
    z-index: 0;

    &::before,
    &::after {
      display: block;
      content: none;
      width: 150px;
      height: 150px;
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
    height: 150px;
  }
`

export const HeaderStyle = styled.div`
  position: sticky;
  height: 24px;
  margin-top: -16px;
  top: 0;
  z-index: 10;
`

export const BackButtonStyle = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  height: 48px;
  width: 48px;
  user-select: none;
  margin-left: -16px;
  z-index: 10;
`

export const BackIconStyle = styled.span`
  border: solid #ffffff;
  border-width: 0 4px 4px 0;
  display: inline-block;
  padding: 4px;
  transform: rotate(135deg);
  -webkit-transform: rotate(135deg);
`

export const BodyStyle = styled.div`
  position: relative;
  padding: 16px 0;

  .swiper-wrapper {
    transition-timing-function: cubic-bezier(0.22, 0.68, 0.25, 1);
  }

  .swiper-slide {
    cursor: pointer;
    user-select: none;

    img {
      -webkit-user-drag: none;
    }
  }

  .pokemon-visual {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
    backface-visibility: hidden;
  }

  .pokemon-visual[data-wave-visible='true'] {
    will-change: transform, opacity;
  }

  .swiper-slide-active {
    cursor: grab;
  }

  @media (prefers-reduced-motion: reduce) {
    .swiper-wrapper {
      transition-duration: 0ms !important;
    }

    .pokemon-visual {
      filter: none !important;
    }
  }
`

export const CarouselStageStyle = styled.div`
  position: relative;
  isolation: isolate;
  padding-top: 6px;

  .swiper {
    z-index: 1;
  }
`

export const NameStyle = styled.div`
  display: flex;
  column-gap: 8px;
  width: 100%;
  height: 48px;
  line-height: 48px;
  text-align: center;
  margin: 0;
  text-transform: capitalize;
  color: #fff;
  font-size: clamp(24px, 3vw, 28px);
  font-weight: 600;
  letter-spacing: -0.02em;
  animation: pokemon-name-reveal 320ms ease-out both;
  justify-content: center;
  align-items: center;

  @keyframes pokemon-name-reveal {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const NameLoadingStyle = styled.div`
  position: relative;
  display: flex;
  column-gap: 8px;
  width: 100%;
  height: 48px;
  line-height: 48px;
  text-align: center;
  margin: 0;
  text-transform: capitalize;
  color: #fff;
  font-size: clamp(24px, 3vw, 28px);
  font-weight: 600;
  letter-spacing: -0.02em;
  animation: pokemon-name-reveal 320ms ease-out both;
  justify-content: center;
  align-items: center;

  .tuning-signal {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 20px;
    color: #c9f9df;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: calc(100% - 5px);
  }

  .tuning-signal i {
    width: 2px;
    height: 15px;
    border-radius: 2px;
    background: currentColor;
    animation: tuning-wave 740ms ease-in-out infinite alternate;
  }
  .tuning-signal i:nth-child(2) {
    animation-delay: -220ms;
  }
  .tuning-signal i:nth-child(3) {
    animation-delay: -440ms;
  }
  .tuning-signal i:nth-child(4) {
    animation-delay: -110ms;
  }
  .tuning-signal i:nth-child(5) {
    animation-delay: -330ms;
  }
  .tuning-dots {
    letter-spacing: 0.16em;
  }

  @keyframes tuning-wave {
    from {
      transform: scaleY(0.25);
      opacity: 0.4;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tuning-signal i {
      animation: none;
    }
  }
`

export const DetailsRegionStyle = styled.div`
  position: relative;
  min-height: 600px;
`

export const DetailsContentStyle = styled.div`
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity 320ms ease-out,
    transform 320ms ease-out;

  &[data-loading='true'] {
    visibility: hidden;
    opacity: 0;
    transform: translateY(5px);
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const DetailsSkeletonStyle = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  color: rgba(235, 247, 241, 0.52);
  font-size: 13px;
  animation: skeleton-enter 160ms ease-out both;

  .skeleton-shape {
    display: block;
    position: relative;
    overflow: hidden;
    background: rgba(215, 239, 227, 0.12);
    border-radius: 5px;
    height: 12px;
  }

  .skeleton-shape::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      rgba(211, 255, 233, 0.21) 50%,
      transparent 80%
    );
    transform: translateX(-100%);
    animation: signal-sweep 1.4s ease-in-out infinite;
  }

  .skeleton-stats {
    display: grid;
    gap: 8px;
  }
  .skeleton-stat-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 18px;
    text-transform: capitalize;
  }
  .skeleton-value {
    width: 26px;
    height: 9px;
  }
  .skeleton-track {
    height: 16px;
    margin-top: 4px;
    border-radius: 5px;
    background: rgba(225, 240, 232, 0.055);
  }
  .skeleton-track > span {
    height: 100%;
  }
  .skeleton-card {
    margin-top: 16px;
    padding: 12px 16px;
    border: 1px solid rgba(223, 248, 233, 0.08);
    border-radius: 12px;
    background: rgba(218, 246, 229, 0.035);
    text-align: center;
    display: grid;
    gap: 16px;
  }
  .skeleton-measurements {
    grid-template-columns: repeat(2, 1fr);
  }
  .skeleton-measurements i {
    width: 24px;
    justify-self: center;
  }
  .skeleton-pills {
    display: flex;
    justify-content: center;
    gap: 24px;
  }
  .skeleton-pills i {
    width: min(24%, 100px);
  }
  .skeleton-move {
    display: flex;
    justify-content: space-around;
  }
  .skeleton-move i:first-child {
    width: 24%;
  }
  .skeleton-move i:last-child {
    width: 20px;
  }

  @keyframes signal-sweep {
    to {
      transform: translateX(100%);
    }
  }
  @keyframes skeleton-enter {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    .skeleton-shape::after {
      animation: none;
    }
  }
`
