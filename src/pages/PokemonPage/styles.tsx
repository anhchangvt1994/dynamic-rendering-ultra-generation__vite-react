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
  }

  .swiper img,
  .pokemon-solo img {
    height: 150px;
    width: 100%;
    object-fit: contain;
    filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.18));
  }

  /* while artwork loads (or after it fails): a Poké Ball doing the
     in-game catch shake, drawn inline so it costs no request */
  .swiper img:not([data-loaded]),
  .pokemon-solo img:not([data-loaded]) {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='46' fill='%23f4f4f4' stroke='%23222' stroke-width='6'/%3E%3Cpath d='M4 50a46 46 0 0 1 92 0z' fill='%23e3350d' stroke='%23222' stroke-width='6'/%3E%3Cpath d='M4 50h92' stroke='%23222' stroke-width='6'/%3E%3Ccircle cx='50' cy='50' r='13' fill='%23f4f4f4' stroke='%23222' stroke-width='6'/%3E%3Ccircle cx='50' cy='50' r='5' fill='%23fff' stroke='%23222' stroke-width='3'/%3E%3C/svg%3E") center / 44px no-repeat;
    animation: artwork-catch 1.6s ease-in-out infinite;
  }
  @keyframes artwork-catch {
    0%,
    45%,
    100% {
      rotate: 0deg;
    }
    55% {
      rotate: -16deg;
    }
    65% {
      rotate: 12deg;
    }
    75% {
      rotate: -6deg;
    }
    85% {
      rotate: 0deg;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .swiper img:not([data-loaded]),
    .pokemon-solo img:not([data-loaded]) {
      animation: none;
    }
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
  max-width: 640px;
  margin: 0 auto 4px;
  position: relative;
  min-height: 36px;
  z-index: 10;
`

export const BackButtonStyle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 0 12px 0 10px;
  border: 1px solid #ffffff25;
  border-radius: 11px;
  background: #ffffff0c;
  backdrop-filter: blur(10px);
  color: #d8e2ed;
  font: inherit;
  font-size: 11px;
  user-select: none;
  transition: background 150ms;
  &:hover {
    background: #ffffff18;
  }
  .back-arrow {
    width: 17px;
    height: 17px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  &:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 3px;
  }
`

export const BodyStyle = styled.div`
  position: relative;
  padding: 16px 0;
  /* one readable column on wide screens instead of a 1200px stretch */
  max-width: 640px;
  margin: 0 auto;

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

// The Pokémon whose power is shown: the centred carousel slide, or the
// lone artwork for forms outside the carousel.
const SELECTED = ':is(.swiper-slide-active, .pokemon-solo)'

export const CarouselStageStyle = styled.div`
  position: relative;
  isolation: isolate;
  padding-top: 6px;

  .swiper {
    z-index: 1;
  }

  /* giant outlined Pokédex number behind the stage */
  .dex-number {
    position: absolute;
    z-index: 0;
    top: 8px;
    left: 50%;
    translate: -50% 0;
    font-family: 'Dela Gothic One', sans-serif;
    /* sized so "#0445" stays inside the stage */
    font-size: clamp(48px, 17vw, 84px);
    line-height: 1 !important;
    letter-spacing: -0.02em;
    color: transparent;
    -webkit-text-stroke: 1.5px
      color-mix(in srgb, var(--aura-a) 55%, transparent);
    opacity: 0.3;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
    animation: dex-in 700ms cubic-bezier(0.2, 0.9, 0.3, 1) both;
  }
  @keyframes dex-in {
    from {
      opacity: 0;
      letter-spacing: 0.2em;
    }
    to {
      opacity: 0.3;
      letter-spacing: -0.02em;
    }
  }

  /* "Who's that Pokémon?": every Pokémon that has not been revealed is a
     silhouette: all the neighbours, and the centred one until its data
     arrives. Only the revealed one shows its colours (arrival flash).
     Artwork still loading keeps its Poké Ball, which gives nothing away. */
  .swiper-slide:not(.swiper-slide-active) img[data-loaded],
  &[data-loading='true'] ${SELECTED} img[data-loaded] {
    filter: brightness(0) drop-shadow(0 0 1px rgba(255, 255, 255, 0.55))
      drop-shadow(0 0 14px rgba(120, 200, 255, 0.45)) !important;
  }

  /* forms outside the National Dex carousel get a single, still stage */
  .pokemon-solo {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: center;
    height: 190px;
  }
  .pokemon-solo .pokemon-visual {
    width: calc(100% / 3);
  }

  /*
   * Effects below use the artwork as a mask, so they only draw once the
   * <img> itself has loaded (:has(img[data-loaded])); otherwise a slow
   * image would leave a glowing ghost around the Poké Ball placeholder.
   *
   * Power reveal on the selected Pokémon, by BST tier (data-aura = 0..9,
   * see power.mjs). A band of light scans the Pokémon itself from feet to
   * head (clipped to its silhouette via --art), then leaves a rim light.
   * Stronger tiers glint again more often; EX scans in holo colours.
   */
  .pokemon-visual {
    position: relative;
  }
  &[data-aura] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
    content: '';
    mix-blend-mode: screen;
    position: absolute;
    inset: 20px 0;
    pointer-events: none;
    -webkit-mask: var(--art) center / contain no-repeat;
    mask: var(--art) center / contain no-repeat;
    background: linear-gradient(
        to top,
        transparent 45%,
        color-mix(in srgb, var(--aura-a) 80%, transparent) 48.6%,
        #fff 50%,
        color-mix(in srgb, var(--aura-a) 80%, transparent) 51.4%,
        transparent 55%
      )
      0 0 / 100% 300% no-repeat;
    animation: aura-scan 2.6s ease-in-out both;
  }
  &[data-aura='0'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after,
  &[data-aura='1'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
    opacity: 0.45;
  }
  &[data-aura='4'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after,
  &[data-aura='5'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
    animation-duration: 6s;
    animation-iteration-count: infinite;
  }
  &[data-aura='6'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after,
  &[data-aura='7'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
    animation-duration: 3.6s;
    animation-iteration-count: infinite;
  }
  &[data-aura='8'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after,
  &[data-aura='9'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
    animation-duration: 2.6s;
    animation-iteration-count: infinite;
  }
  &[data-aura='9'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
    background-image: linear-gradient(
      to top,
      transparent 43%,
      #ff5f6d 46%,
      #ffd86f 48.2%,
      #fff 50%,
      #6bf2ff 51.8%,
      #c77dff 54%,
      transparent 57%
    );
  }

  /*
   * B and up: an energy aura behind the Pokémon in its own shape. The box
   * is grown by --grow on every side, so the "contain" mask draws the same
   * silhouette a little larger; streaks inside rise like ki. Higher tiers
   * grow it further and run it faster.
   */
  &[data-aura='4'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='5'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='6'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='7'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='8'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='9'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before {
    --grow: 7px;
    --flow: 0.9s;
    content: '';
    position: absolute;
    z-index: -1;
    inset: calc(20px - var(--grow)) calc(var(--grow) * -1);
    pointer-events: none;
    -webkit-mask: var(--art) center / contain no-repeat;
    mask: var(--art) center / contain no-repeat;
    background:
      repeating-linear-gradient(
          to top,
          transparent 0 9px,
          rgba(255, 255, 255, 0.75) 9px 12px
        )
        0 0 / 100% 48px,
      linear-gradient(to top, var(--aura-a), var(--aura-b) 70%, transparent);
    filter: blur(2.5px);
    animation:
      aura-awaken 900ms ease-out both,
      aura-flow var(--flow) linear 900ms infinite,
      aura-surge 1.2s ease-in-out 900ms infinite alternate;
  }
  &[data-aura='6'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='7'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before {
    --grow: 10px;
    --flow: 0.6s;
  }
  &[data-aura='8'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before,
  &[data-aura='9'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before {
    --grow: 13px;
    --flow: 0.42s;
  }
  &[data-aura='9'] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before {
    background:
      repeating-linear-gradient(
          to top,
          transparent 0 9px,
          rgba(255, 255, 255, 0.85) 9px 12px
        )
        0 0 / 100% 48px,
      linear-gradient(to top, #ff5f6d, #ffd86f, #6bf2ff, #c77dff);
  }

  /* rim light that the scan leaves behind */
  &[data-aura] ${SELECTED} img {
    animation:
      aura-rim-in 600ms ease-out 900ms both,
      aura-flash 700ms ease-out;
  }
  &[data-aura='6'] ${SELECTED} img,
  &[data-aura='7'] ${SELECTED} img,
  &[data-aura='8'] ${SELECTED} img {
    animation:
      aura-rim-in 600ms ease-out 900ms both,
      aura-rim-breathe 2.4s ease-in-out 1.5s infinite alternate,
      aura-flash 700ms ease-out;
  }
  &[data-aura='9'] ${SELECTED} img {
    animation:
      aura-rim-in 600ms ease-out 900ms both,
      aura-rim-prism 4s linear 1.5s infinite,
      aura-flash 700ms ease-out;
  }
  &[data-aura='0'] ${SELECTED} img,
  &[data-aura='1'] ${SELECTED} img {
    --rim: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.18));
  }
  &[data-aura='2'] ${SELECTED} img,
  &[data-aura='3'] ${SELECTED} img {
    --rim: drop-shadow(0 0 1px var(--aura-a)) drop-shadow(0 0 1px var(--aura-a));
  }
  &[data-aura='4'] ${SELECTED} img,
  &[data-aura='5'] ${SELECTED} img {
    --rim: drop-shadow(0 0 1px var(--aura-a))
      drop-shadow(0 0 1.5px var(--aura-a)) drop-shadow(0 0 8px var(--aura-b));
  }
  &[data-aura='6'] ${SELECTED} img,
  &[data-aura='7'] ${SELECTED} img,
  &[data-aura='8'] ${SELECTED} img,
  &[data-aura='9'] ${SELECTED} img {
    --rim: drop-shadow(0 0 1px #fff) drop-shadow(0 0 2px var(--aura-a))
      drop-shadow(0 0 12px var(--aura-b));
  }

  @keyframes aura-flash {
    0% {
      filter: brightness(4) saturate(0);
    }
    100% {
      filter: brightness(1) saturate(1);
    }
  }
  @keyframes aura-awaken {
    0% {
      transform: scale(0.85);
      opacity: 0;
    }
    60% {
      transform: scale(1.12);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.9;
    }
  }
  @keyframes aura-flow {
    to {
      background-position:
        0 -48px,
        0 0;
    }
  }
  @keyframes aura-surge {
    from {
      transform: scale(0.98);
      opacity: 0.7;
    }
    to {
      transform: scale(1.04);
      opacity: 1;
    }
  }
  @keyframes aura-scan {
    0% {
      background-position: 0 0;
    }
    40%,
    100% {
      background-position: 0 100%;
    }
  }
  @keyframes aura-rim-in {
    from {
      filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.18));
    }
    to {
      filter: var(--rim);
    }
  }
  @keyframes aura-rim-breathe {
    from {
      filter: var(--rim);
    }
    to {
      filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 3px var(--aura-a))
        drop-shadow(0 0 20px var(--aura-b));
    }
  }
  @keyframes aura-rim-prism {
    0%,
    100% {
      filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 3px #ff5f6d)
        drop-shadow(0 0 14px #ff5f6d);
    }
    33% {
      filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 3px #ffd86f)
        drop-shadow(0 0 14px #ffd86f);
    }
    66% {
      filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 3px #6bf2ff)
        drop-shadow(0 0 14px #6bf2ff);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-aura] ${SELECTED} .pokemon-visual:has(img[data-loaded])::before {
      animation: none;
      opacity: 0.8;
    }
    &[data-aura] ${SELECTED} .pokemon-visual:has(img[data-loaded])::after {
      display: none;
    }
    &[data-aura] ${SELECTED} img {
      animation: none;
      filter: var(--rim);
    }
  }
`

// Holds PokemonName; same height as the loading line so nothing jumps.
export const NameStyle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
`

// "Who's that Pokémon?" in the anime's title colours: yellow on blue.
export const NameLoadingStyle = styled.div`
  position: relative;
  display: flex;
  column-gap: 10px;
  width: 100%;
  min-height: 52px;
  text-align: center;
  margin: 0;
  font-family: 'Dela Gothic One', 'Be Vietnam Pro', sans-serif;
  /* one line at 320px+: 19 letters of Dela at ~0.85em each */
  font-size: clamp(14px, 4.6vw, 20px);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  color: #ffcb05;
  text-shadow:
    0 1px 0 #3c5aa6,
    0 2px 0 #3c5aa6,
    0 3px 0 #2a4580,
    0 6px 10px rgba(0, 0, 0, 0.4);
  animation: pokemon-name-reveal 320ms ease-out both;
  justify-content: center;
  align-items: center;

  .tuning-signal {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 20px;
    color: #c9f9df;
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
    opacity 180ms ease-out,
    transform 220ms ease-out;

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

  /* mirrors PokemonStatRadar: a glass panel with the hexagon */
  .skeleton-radar {
    margin: 0 0 16px;
    height: 260px;
    place-items: center;
  }
  .skeleton-radar > i {
    width: 150px;
    height: 172px;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
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
  /* mirrors PokemonPower: badge | rising ladder | total */
  .skeleton-power {
    margin: 0 0 16px;
    grid-template-columns: 52px 1fr 48px;
    column-gap: 14px;
    align-items: center;
    height: 88px;
  }
  .skeleton-power > i:first-child {
    width: 52px;
    height: 58px;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  }
  .skeleton-ladder {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 3px;
    align-items: end;
    height: 32px;
  }
  .skeleton-ladder i {
    height: calc(8px + var(--i) * 2.6px);
    transform: skewX(-16deg);
  }
  .skeleton-power > i:last-child {
    height: 40px;
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

// A failed Pokémon load inside the page: one line and a retry pill.
export const InlineAlertStyle = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(227, 53, 13, 0.18);
  box-shadow: inset 0 0 0 1px rgba(255, 140, 120, 0.45);
  color: #ffe2db;
  font-size: 14px;

  button {
    min-height: 44px;
    padding: 0 18px;
    border: none;
    border-radius: 999px;
    background: #e3350d;
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid #ffcb05;
    outline-offset: 2px;
  }
`

// Swiping, tapping neighbours and keyboard arrows navigate the stage.
export const StageWrapStyle = styled.div`
  position: relative;

  /* the catch: flash white, get drawn down into the ball, come back out */
  &[data-catching='true'] :is(.swiper-slide-active, .pokemon-solo) img {
    animation: stage-absorb 2400ms cubic-bezier(0.5, 0, 0.3, 1) both !important;
  }
  @keyframes stage-absorb {
    0%,
    22% {
      transform: none;
      filter: none;
      opacity: 1;
    }
    30% {
      transform: scale(1.04);
      filter: brightness(3) saturate(0);
    }
    44% {
      transform: translateY(18px) scale(0.08);
      filter: brightness(2) sepia(1) hue-rotate(-50deg) saturate(6);
      opacity: 0.9;
    }
    46%,
    86% {
      transform: translateY(18px) scale(0);
      opacity: 0;
    }
    100% {
      transform: none;
      filter: none;
      opacity: 1;
    }
  }
  &:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 4px;
    border-radius: 18px;
  }
`
