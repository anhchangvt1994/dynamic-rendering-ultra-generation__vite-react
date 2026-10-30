export const HomePageStyle = styled.div`
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 40px 0;
  color: var(--ink);
  .eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.8px;
  }
  .field-strip {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 4px;
    color: var(--muted);
    font-size: 12px;
    letter-spacing: 1px;
  }
  .field-strip span {
    display: inline-flex;
    align-items: center;
    gap: 9px;
  }
  .field-strip span:first-child {
    font-weight: 700;
    color: var(--ink);
  }
  .collection {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 22px 26px;
    background: var(--mint);
    border: 1px solid #c9e2d6;
    border-radius: var(--radius-card);
  }
  .collection-mark {
    width: 50px;
    height: 50px;
    flex: none;
    display: grid;
    place-items: center;
    background: #ffffff80;
    border-radius: 50%;
  }
  .collection-mark svg {
    width: 30px;
  }
  .collection-copy {
    flex: 1;
    min-width: 0;
  }
  .collection h2 {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.3px;
  }
  .collection-copy p {
    font-size: 11px;
    margin-top: 3px;
    color: #496658;
  }
  .collection-progress {
    width: 170px;
    flex: none;
  }
  .collection-progress > div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .collection-progress strong {
    font-size: 20px;
    font-weight: 800;
  }
  .collection-progress small {
    font-size: 11px;
    font-weight: 500;
    color: #496658;
  }
  .collection-progress span {
    font-size: 12px;
    color: #496658;
  }
  progress {
    display: block;
    width: 100%;
    height: 5px;
    margin-top: 7px;
    appearance: none;
    border: none;
    border-radius: 10px;
    overflow: hidden;
    background: #b4d3c3;
    accent-color: var(--ink);
  }
  progress::-webkit-progress-bar {
    background: #b4d3c3;
  }
  progress::-webkit-progress-value {
    background: var(--ink);
    border-radius: 10px;
  }
  progress::-moz-progress-bar {
    background: var(--ink);
  }
  .collection-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: transparent;
    padding: 12px 0 12px 22px;
    border: 0;
    border-left: 1px solid #b4d3c3;
    color: var(--ink);
    font-size: 11px;
    font-weight: 700;
    margin-left: 12px;
  }
  .collection-link:hover {
    color: #2f7459;
  }
  .catalog {
    padding-top: 44px;
    scroll-margin-top: 20px;
  }
  .catalog-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    margin-bottom: 24px;
  }
  .catalog-heading .eyebrow {
    color: var(--muted);
    font-size: 11px;
  }
  .catalog h2 {
    font-size: clamp(23px, 2.4vw, 30px);
    font-weight: 800;
    letter-spacing: -1.1px;
    margin-top: 5px;
  }
  .catalog h2 span {
    color: var(--red);
  }
  .random-small {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    background: white;
    border: 1px solid var(--line);
    border-radius: 13px;
    color: var(--ink);
    flex: none;
  }
  .random-small:hover {
    background: var(--yellow);
  }
  .catalog-tools {
    display: flex;
    gap: 12px;
  }
  .catalog-search {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 12px;
    padding: 0 15px;
    height: 50px;
    background: white;
    border: 1px solid var(--line);
    border-radius: 12px;
    color: var(--muted);
    min-width: 0;
  }
  .catalog-search:focus-within {
    border-color: var(--focus);
    box-shadow: 0 0 0 3px #2666b115;
  }
  .catalog-search > svg {
    flex: none;
  }
  .catalog-search input {
    width: 100%;
    min-width: 0;
    height: 100%;
    background: transparent;
    border: 0;
    outline: none;
    color: var(--ink);
    font-size: 13px;
  }
  .catalog-search input:focus-visible {
    outline: 0;
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  .catalog-search button {
    display: grid;
    place-items: center;
    flex: none;
    width: 30px;
    height: 36px;
    border: 0;
    background: transparent;
    color: var(--muted);
  }
  .catalog-selects {
    display: flex;
    gap: 10px;
  }
  .catalog-selects {
    width: 340px;
    flex: none;
  }
  .catalog-selects > button {
    flex: 1;
  }
  .type-filter {
    display: flex;
    gap: 7px;
    overflow-x: auto;
    scrollbar-width: none;
    margin: 16px 0 20px;
    padding: 3px 2px 5px;
  }
  .type-filter::-webkit-scrollbar {
    display: none;
  }
  /* wide screens have the room: every type stays reachable by mouse */
  @media (min-width: 681px) {
    .type-filter {
      flex-wrap: wrap;
      overflow: visible;
    }
  }
  .type-filter button {
    flex: none;
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 37px;
    padding: 0 13px;
    background: white;
    border: 1px solid var(--line);
    border-radius: 99px;
    color: var(--muted);
    font-size: 11px;
    font-weight: 600;
    transition: background 120ms;
  }
  .type-filter button span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .type-filter button[aria-pressed='true'] {
    background: var(--ink);
    border-color: var(--ink);
    color: white;
  }
  .type-filter button:hover:not([aria-pressed='true']) {
    background: #e7edf4;
  }
  .results-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 18px;
  }
  .view-tabs {
    display: flex;
    gap: 5px;
  }
  .view-tabs button {
    min-height: 39px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    padding: 0 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .view-tabs button[aria-pressed='true'] {
    color: var(--ink);
    background: #e5ebf2;
  }
  .view-tabs button:hover {
    background: #e5ebf2;
  }
  .view-tabs svg {
    width: 16px;
    height: 16px;
  }
  .view-tabs button span {
    min-width: 19px;
    padding: 0 4px;
    border-radius: 5px;
    background: white;
    font-size: 11px;
  }
  .result-count {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }
  .active-filters {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: space-between;
    margin-bottom: 14px;
    font-size: 11px;
    color: var(--muted);
  }
  .active-filters > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .active-filters button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    padding: 7px 0;
    border: 0;
    background: transparent;
    color: var(--red);
    font-size: 11px;
    font-weight: 600;
  }
  .catalog-state {
    min-height: 270px;
    border: 1px dashed #c4d0dc;
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 28px;
    background: #ffffff70;
  }
  .catalog-state > svg {
    width: 36px;
    height: 36px;
    margin-bottom: 14px;
    opacity: 0.75;
  }
  .catalog-state h3 {
    font-size: 16px;
    font-weight: 700;
  }
  .catalog-state p {
    font-size: 12px;
    color: var(--muted);
    margin-top: 5px;
  }
  .catalog-state button {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border: 0;
    border-radius: 10px;
    background: var(--ink);
    color: white;
    margin-top: 20px;
    font-size: 12px;
  }
  .catalog-state button:hover {
    background: var(--ink-soft);
  }
  .loading-ball {
    animation: tiny-wobble 1s ease-in-out infinite;
  }
  @keyframes tiny-wobble {
    25% {
      transform: rotate(-15deg);
    }
    75% {
      transform: rotate(15deg);
    }
  }
  .load-more {
    text-align: center;
    padding: 28px 0 5px;
  }
  .load-more button {
    display: inline-flex;
    align-items: center;
    gap: 18px;
    min-height: 46px;
    padding: 0 22px;
    color: var(--ink);
    background: white;
    border: 1px solid var(--line);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
  }
  .load-more button:hover {
    background: var(--yellow);
    border-color: var(--yellow);
  }
  .load-more button span {
    color: var(--muted);
    font-size: 12px;
    font-weight: 500;
  }
  .load-more p {
    font-size: 12px;
    color: var(--muted);
    margin-top: 10px;
  }
  .field-footer {
    margin-top: 42px;
    padding: 24px 0 28px;
    border-top: 1px solid var(--line);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .field-footer > span {
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .field-footer svg {
    width: 21px;
    height: 21px;
    flex: none;
  }
  .field-footer p {
    text-align: right;
    font-size: 11px;
    color: var(--muted);
    line-height: 1.8 !important;
  }
  .field-footer a {
    color: var(--muted);
    text-decoration: underline;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 900px) {
    .collection-link span {
      display: none;
    }
    .collection-link {
      padding-left: 12px;
      margin-left: 0;
    }
    .collection {
      gap: 12px;
      padding: 20px;
    }
    .collection-progress {
      width: 130px;
    }
  }
  @media (max-width: 680px) {
    padding: 16px 18px 0;
    .field-strip {
      padding: 15px 0;
      font-size: 11px;
      letter-spacing: 1px;
      justify-content: center;
    }
    .field-strip span:last-child {
      display: none;
    }
    .collection {
      display: grid;
      grid-template-columns: 35px 1fr 32px;
      gap: 8px 10px;
      padding: 16px;
      border-radius: 17px;
    }
    .collection-mark {
      width: 35px;
      height: 35px;
    }
    .collection-mark svg {
      width: 25px;
    }
    .collection h2 {
      font-size: 12px;
    }
    .collection-copy p {
      font-size: 11px;
      margin-top: 2px;
    }
    .collection-progress {
      width: 100%;
      grid-row: 2;
      grid-column: 2 / 4;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .collection-progress > div {
      flex: none;
    }
    .collection-progress strong {
      font-size: 15px;
    }
    .collection-progress small {
      font-size: 11px;
    }
    .collection-progress span {
      display: none;
    }
    .collection-progress progress {
      margin-top: 0;
      flex: 1;
      min-width: 0;
      height: 4px;
    }
    .collection-link {
      grid-column: 3;
      grid-row: 1;
      min-height: 36px;
      border: 0;
      padding: 0;
    }
    .catalog {
      padding-top: 28px;
      scroll-margin-top: 14px;
    }
    .catalog-heading {
      margin-bottom: 17px;
    }
    .catalog h2 {
      font-size: 21px;
      letter-spacing: -0.8px;
      margin-top: 4px;
    }
    .catalog-heading .eyebrow {
      font-size: 11px;
      letter-spacing: 1.6px;
    }
    .random-small {
      width: 36px;
      height: 39px;
      border-radius: 10px;
    }
    .catalog-tools {
      flex-direction: column;
      gap: 9px;
    }
    .catalog-search {
      flex: none;
      height: 46px;
    }
    .catalog-search input {
      font-size: 16px;
    }
    .catalog-selects {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }
    .type-filter {
      margin: 11px -18px 12px;
      padding: 4px 18px 5px;
      scroll-padding-inline: 18px;
    }
    .type-filter button {
      min-height: 35px;
      padding: 0 12px;
      font-size: 12px;
    }
    .results-heading {
      padding-bottom: 12px;
    }
    .view-tabs button {
      font-size: 12px;
      min-height: 37px;
      padding: 0 9px;
    }
    .result-count {
      font-size: 11px;
    }
    .field-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      margin-top: 28px;
    }
    .field-footer > span {
      font-size: 12px;
    }
    .field-footer p {
      font-size: 11px;
      text-align: left;
    }
  }
`

export const PokemonListStyle = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 11px;
  }
`

export const BottomLineStyle = styled.div``

export const HeroStyle = styled.section`
  display: grid;
  /* minmax(0, …): a long word in the encounter must not widen the hero */
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
  min-height: 410px;
  border-radius: 26px;
  background: var(--ink);
  color: white;
  overflow: hidden;
  isolation: isolate;
  .hero-copy {
    padding: 40px 0 30px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    letter-spacing: 1.3px;
    color: #cad6e2;
  }
  .eyebrow i {
    width: 5px;
    height: 5px;
    background: var(--yellow);
    border-radius: 50%;
  }
  h1 {
    font-size: clamp(32px, 3.5vw, 44px);
    font-weight: 800;
    line-height: 1.24 !important;
    letter-spacing: -1.7px;
    margin: 22px 0 18px;
  }
  h1 span {
    color: var(--yellow);
    line-height: inherit !important;
  }
  .hero-copy > p {
    font-size: 11px;
    line-height: 1.9 !important;
    color: #b7c8d8;
  }
  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 18px;
    margin-top: 26px;
  }
  .hero-actions button,
  .hero-actions .quiz-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 44px;
    padding: 0 19px;
    border-radius: 10px;
    border: 0;
    font-size: 11px;
    font-weight: 700;
    transition:
      transform 150ms,
      background 150ms;
  }
  .hero-actions .explore {
    background: var(--yellow);
    color: var(--ink);
  }
  .hero-actions .explore:hover {
    background: #ffe789;
    transform: translateY(-2px);
  }
  .hero-actions .random {
    color: white;
    background: transparent;
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    gap: 7px;
  }
  .hero-actions .random:hover {
    color: var(--yellow);
  }
  /* the quiz: a black silhouette badge with a yellow question mark */
  .quiz-badge {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0b1626;
    box-shadow: 0 0 0 2px var(--yellow);
    color: var(--yellow);
    font-family: var(--font-display);
    font-size: 13px;
    line-height: 1 !important;
  }
  .hero-actions .quiz-link:hover .quiz-badge {
    transform: rotate(-12deg) scale(1.1);
  }
  .quiz-badge {
    transition: transform 160ms ease-out;
  }
  .hero-footnote {
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 11px;
    margin-top: 27px;
    color: #a5bbcd;
  }
  .hero-footnote i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #607d95;
  }
  .encounter {
    position: relative;
    margin: 20px;
    margin-left: 24px;
    padding: 20px 23px 16px;
    border-radius: 18px;
    background: var(--encounter);
    color: var(--ink);
    transform: rotate(2deg);
    display: flex;
    flex-direction: column;
    transition: background 220ms;
  }
  .encounter-top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 3;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  /* room for the reroll badge on the corner (13px still spare at 320px) */
  .encounter-top > span:last-child {
    margin-right: 10px;
  }
  .encounter-top > span:first-child {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  /* reroll: a glossy toy Poké Ball pinned on the card's corner like a
     sticker; its centre button carries a refresh mark. Out of the header
     row (it would wrap on a 320px phone); the hero keeps 14px+ around the
     card; ::after makes the touch target 48px. */
  .reroll {
    position: absolute;
    z-index: 4;
    top: -15px;
    right: -11px;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
    transition: transform 140ms ease-out;
  }
  .reroll::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
  }
  .reroll-ball {
    position: relative;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 2.5px solid #1b1d22;
    border-radius: 50%;
    /* red cap, black band, white base; a highlight up top-left */
    background:
      radial-gradient(
        circle at 30% 24%,
        rgba(255, 255, 255, 0.95) 0 9%,
        rgba(255, 255, 255, 0) 24%
      ),
      linear-gradient(
        to bottom,
        #ff6b5a 0%,
        #e3350d 44%,
        #1b1d22 44% 56%,
        #ffffff 56%,
        #dfe5ee 100%
      );
    box-shadow:
      inset -3px -4px 0 rgba(0, 0, 0, 0.16),
      0 3px 0 rgba(23, 45, 69, 0.35),
      0 6px 14px rgba(0, 0, 0, 0.28);
    animation: reroll-arrive 420ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .reroll-core {
    display: grid;
    place-items: center;
    width: 15px;
    height: 15px;
    border: 2.5px solid #1b1d22;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, #e6ebf2);
  }
  .reroll-core svg {
    width: 9px;
    height: 9px;
    fill: #1b1d22;
  }
  .reroll:hover .reroll-ball,
  .reroll:focus-visible .reroll-ball {
    animation: reroll-wiggle 600ms ease-in-out;
  }
  .reroll:hover .reroll-core svg,
  .reroll:focus-visible .reroll-core svg {
    animation: reroll-turn 900ms linear infinite;
  }
  .reroll:active {
    transform: translateY(2px) scale(0.92);
  }
  .reroll:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 2px;
  }
  /* thrown: the corner is empty until a fresh ball pops back */
  .reroll[data-throwing='true'] .reroll-ball {
    visibility: hidden;
  }
  /* first visit: a speech bubble says what the ball does */
  .reroll-hint {
    position: absolute;
    top: 50%;
    right: calc(100% + 8px);
    translate: 0 -50%;
    padding: 6px 10px;
    border-radius: 10px;
    background: #fff;
    box-shadow:
      0 0 0 1.5px #172d45,
      0 4px 0 rgba(23, 45, 69, 0.25);
    color: var(--ink);
    font-size: 12px;
    font-weight: 800;
    white-space: nowrap;
    pointer-events: none;
    animation: reroll-hint 4s ease-in-out both;
  }
  .reroll-hint::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -6px;
    width: 10px;
    height: 10px;
    background: #fff;
    box-shadow: 1.5px -1.5px 0 #172d45;
    translate: 0 -50%;
    rotate: 45deg;
  }
  @keyframes reroll-hint {
    0% {
      opacity: 0;
      scale: 0.6;
    }
    8%,
    88% {
      opacity: 1;
      scale: 1;
    }
    to {
      opacity: 0;
      scale: 0.9;
    }
  }
  @keyframes reroll-arrive {
    from {
      scale: 0.2;
      opacity: 0;
    }
  }
  @keyframes reroll-turn {
    to {
      rotate: 1turn;
    }
  }
  @keyframes reroll-wiggle {
    25% {
      rotate: -16deg;
    }
    50% {
      rotate: 12deg;
    }
    75% {
      rotate: -6deg;
    }
  }

  /* the throw: corner to the art's centre in an arc, spinning and growing;
     it opens with a flash and stars as the new Pokémon pops out */
  .throw {
    position: absolute;
    z-index: 3;
    inset: 0;
    margin: auto;
    width: 64px;
    height: 64px;
    pointer-events: none;
  }
  .throw-ball {
    position: absolute;
    inset: 0;
    animation: throw-fly var(--throw) linear both;
  }
  .throw-half {
    position: absolute;
    inset: 0;
    border: 3px solid #1b1d22;
    border-radius: 50%;
  }
  .throw-half--top {
    background:
      radial-gradient(
        circle at 30% 24%,
        rgba(255, 255, 255, 0.95) 0 9%,
        rgba(255, 255, 255, 0) 24%
      ),
      linear-gradient(to bottom, #ff6b5a, #e3350d 47%, #1b1d22 47%);
    clip-path: inset(0 0 50% 0);
    transform-origin: 8% 50%;
    animation: throw-open 260ms cubic-bezier(0.3, 1.4, 0.5, 1) var(--open) both;
  }
  .throw-half--bottom {
    background:
      radial-gradient(
        circle at 50% 50%,
        #fff 0 12%,
        #1b1d22 12% 19%,
        #0000 19%
      ),
      linear-gradient(to bottom, #1b1d22 53%, #fff 53%, #dfe5ee);
    clip-path: inset(50% 0 0 0);
  }
  .throw-flash {
    position: absolute;
    inset: -30%;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      #fff 0 30%,
      rgba(255, 246, 200, 0.85) 45%,
      rgba(255, 255, 255, 0) 70%
    );
    opacity: 0;
    animation: throw-flash 520ms ease-out var(--open) both;
  }
  .throw-stars {
    position: absolute;
    left: 50%;
    top: 50%;
  }
  .throw-stars i {
    position: absolute;
    left: 0;
    top: 0;
    font-size: calc(18px * var(--s, 1));
    font-style: normal;
    line-height: 1 !important;
    text-shadow:
      0 0 1px #172d45,
      0 0 1px #172d45;
    translate: -50% -50%;
    opacity: 0;
    animation: throw-star 640ms cubic-bezier(0.2, 0.7, 0.3, 1)
      calc(var(--open) + var(--t)) both;
  }
  @keyframes throw-fly {
    0% {
      translate: var(--fx) var(--fy);
      scale: 0.5;
      rotate: 0deg;
      opacity: 1;
    }
    22% {
      translate: calc(var(--fx) * 0.55) calc(var(--fy) * 0.55 - 44px);
      scale: 0.8;
    }
    45% {
      translate: 0 0;
      scale: 1;
      rotate: -720deg;
    }
    50% {
      scale: 1.12 0.9;
    }
    56% {
      scale: 1;
      opacity: 1;
    }
    to {
      translate: 0 0;
      rotate: -720deg;
      scale: 0.7;
      opacity: 0;
    }
  }
  @keyframes throw-open {
    to {
      rotate: -115deg;
    }
  }
  @keyframes throw-flash {
    0% {
      opacity: 0;
      scale: 0.2;
    }
    25% {
      opacity: 1;
    }
    to {
      opacity: 0;
      scale: 1.8;
    }
  }
  @keyframes throw-star {
    0% {
      opacity: 0;
      scale: 0.2;
      rotate: 0deg;
    }
    30% {
      opacity: 1;
      scale: 1.3;
    }
    to {
      opacity: 0;
      scale: 0.7;
      rotate: 160deg;
      translate: calc(-50% + cos(var(--a)) * var(--d))
        calc(-50% + sin(var(--a)) * var(--d));
    }
  }
  /* each new Pokémon pops out of the ball */
  .encounter-art img {
    animation: encounter-pop 520ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  @keyframes encounter-pop {
    from {
      opacity: 0;
      scale: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reroll *,
    .encounter-art img {
      animation: none !important;
    }
    .throw {
      display: none;
    }
  }
  .encounter-top i {
    height: 5px;
    width: 5px;
    border-radius: 50%;
    background: var(--ink);
  }
  .encounter-art {
    flex: 1;
    position: relative;
    min-height: 255px;
    display: grid;
    place-items: center;
    /* the word behind sizes itself to this width (cqi) */
    container-type: inline-size;
  }
  .encounter-art > a {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
    place-items: center;
    z-index: 2;
  }
  .encounter-art img {
    height: 290px;
    width: 310px;
    object-fit: contain;
    filter: drop-shadow(0 17px 9px #172d4526);
    transform: rotate(-7deg);
    transition: transform 300ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  .encounter-art a:hover img {
    transform: rotate(-3deg) translateY(-5px) scale(1.035);
  }
  /* any type's sound word ("TWINKLE!") fits the card: Dela runs ~0.86em
     a capital, the letter-spacing gives 6px back per letter */
  .encounter-word {
    --fit: calc((86cqi / var(--len, 5) + 6px) / 0.86);
    font-family: var(--font-display);
    font-size: min(clamp(66px, 7.5vw, 100px), var(--fit));
    white-space: nowrap;
    letter-spacing: -6px;
    color: transparent;
    -webkit-text-stroke: 1px #172d4535;
    transform: rotate(-10deg);
    user-select: none;
  }
  .orbit {
    position: absolute;
    width: 228px;
    height: 228px;
    border: 1px solid #172d4520;
    border-radius: 50%;
  }
  .orbit-two {
    width: 278px;
    height: 278px;
    border-style: dashed;
    border-color: #172d4515;
  }
  .spark {
    position: absolute;
    color: white;
    font-size: 33px;
  }
  .spark-one {
    top: 28px;
    right: 6px;
    transform: rotate(10deg);
  }
  .spark-two {
    bottom: 26px;
    left: 12px;
    font-size: 40px;
  }
  .type-stamp {
    display: flex;
    align-items: center;
    gap: 7px;
    position: absolute;
    right: -11px;
    bottom: 23px;
    z-index: 3;
    background: white;
    border: 1px solid #172d4520;
    box-shadow: 3px 3px 0 #172d451a;
    padding: 7px 10px;
    transform: rotate(-10deg);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .encounter-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    position: relative;
    z-index: 3;
    border-top: 1px solid #172d452a;
    padding-top: 12px;
  }
  .encounter-bottom > div:first-child {
    min-width: 0;
  }
  .encounter-bottom a {
    color: var(--ink);
    font-size: 21px;
    font-weight: 800;
    letter-spacing: -0.7px;
  }
  .encounter-bottom a span {
    font-weight: 400;
    font-size: 18px;
  }
  .encounter-bottom p {
    font-size: 11px;
    margin-top: 1px;
    opacity: 0.8;
  }
  .encounter-picker {
    display: flex;
    gap: 4px;
    flex: none;
  }
  .encounter-picker button {
    position: relative;
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid #172d452a;
    border-radius: 50%;
    background: #ffffff35;
    transition:
      background 160ms,
      transform 160ms;
  }
  .encounter-picker button[aria-pressed='true'] {
    background: white;
    border-color: var(--ink);
  }
  .encounter-picker button:hover {
    transform: translateY(-2px);
    background: white;
  }
  /* 35px coin, 45px touch target */
  .encounter-picker button::after {
    content: '';
    position: absolute;
    inset: -5px;
  }
  .encounter-picker img {
    width: 27px;
    height: 27px;
    object-fit: contain;
  }
  @media (max-width: 900px) and (min-width: 681px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    .hero-copy {
      padding-left: 25px;
    }
    .hero-actions {
      gap: 12px;
    }
    .hero-actions button {
      padding: 0 12px;
    }
    .encounter {
      margin-left: 15px;
      padding-inline: 15px;
    }
    .encounter-bottom p {
      display: none;
    }
  }
  @media (max-width: 680px) {
    grid-template-columns: minmax(0, 1fr);
    border-radius: 21px;
    .hero-copy {
      padding: 25px 23px 0;
    }
    .eyebrow {
      font-size: 11px;
      letter-spacing: 1px;
      gap: 6px;
    }
    h1 {
      font-size: clamp(27px, 7.5vw, 34px);
      line-height: 1.25 !important;
      letter-spacing: -1.15px;
      margin: 15px 0 11px;
    }
    .desktop-break {
      display: none;
    }
    .hero-copy > p {
      font-size: 11px;
      line-height: 1.8 !important;
    }
    .hero-actions {
      gap: 15px;
      margin-top: 19px;
    }
    .hero-actions button {
      min-height: 41px;
      padding: 0 13px;
      font-size: 12px;
      border-radius: 9px;
      gap: 9px;
    }
    .hero-actions .random {
      font-size: 11px;
      gap: 6px;
    }
    .hero-footnote {
      display: none;
    }
    .encounter {
      margin: 22px 18px 20px;
      padding: 13px 15px;
      border-radius: 14px;
      transform: rotate(1.5deg);
    }
    .encounter-top {
      font-size: 11px;
      letter-spacing: 0.7px;
    }
    .encounter-art {
      min-height: 168px;
    }
    .encounter-art img {
      height: 201px;
      width: 220px;
    }
    .encounter-word {
      font-size: min(78px, var(--fit));
    }
    .orbit {
      height: 154px;
      width: 154px;
    }
    .orbit-two {
      height: 184px;
      width: 184px;
    }
    .spark-one {
      font-size: 24px;
      top: 14px;
      right: 10px;
    }
    .spark-two {
      font-size: 30px;
      bottom: 12px;
      left: 9px;
    }
    .type-stamp {
      right: -6px;
      bottom: 13px;
      font-size: 11px;
      padding: 5px 8px;
    }
    .encounter-bottom {
      padding-top: 8px;
    }
    .encounter-bottom a {
      font-size: 18px;
    }
    .encounter-bottom p {
      font-size: 11px;
      max-width: 160px;
    }
    .encounter-picker button {
      width: 31px;
      height: 33px;
    }
    .encounter-picker img {
      width: 25px;
      height: 25px;
    }
  }
`
