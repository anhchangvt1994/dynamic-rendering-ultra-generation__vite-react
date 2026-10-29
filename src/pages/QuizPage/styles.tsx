import styled from 'styled-components'

export const QuizStyle = styled.section`
  max-width: 720px;
  margin: 0 auto;
  /* the shell gives this route no gutter; the tilted title needs room too */
  padding: 16px 16px 32px;
  color: var(--ink, #172d45);

  .intro {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(34px, 9vw, 56px);
    line-height: 1 !important;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    color: var(--yellow, #ffda55);
    -webkit-text-stroke: 2px #2a4c8f;
    paint-order: stroke fill;
    text-shadow:
      0 4px 0 #2a4c8f,
      0 10px 18px rgba(23, 45, 69, 0.25);
    transform: rotate(-3deg);
    transform-origin: left bottom;
  }
  h1 span {
    color: #fff;
  }
  .score {
    display: flex;
    gap: 14px;
    margin: 0;
  }
  .score div {
    display: grid;
    justify-items: end;
  }
  .score dt {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }
  .score dd {
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
    line-height: 1.1 !important;
    font-variant-numeric: tabular-nums;
  }
  .streak {
    animation: quiz-pop 420ms cubic-bezier(0.3, 1.6, 0.5, 1);
  }

  /* ── settings: generation + difficulty ── */
  .settings {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 12px;
    margin-bottom: 14px;
  }
  .settings > :first-child {
    flex: 1 1 200px;
  }
  .mode {
    display: inline-flex;
    padding: 3px;
    border-radius: 14px;
    background: var(--surface, #fff);
    box-shadow: inset 0 0 0 1px var(--line, #dfe6ed);
  }
  .mode button {
    min-height: 44px;
    padding: 0 14px;
    border: none;
    border-radius: 11px;
    background: none;
    color: var(--muted);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .mode button[aria-pressed='true'] {
    background: var(--ink, #172d45);
    color: #fff;
  }
  .mode button:focus-visible {
    outline: 3px solid var(--focus, #2666b1);
    outline-offset: 1px;
  }

  /* ── hard mode: type the name ── */
  .guess {
    margin-top: 14px;
  }
  .guess label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 700;
  }
  .guess-row {
    display: flex;
    gap: 8px;
  }
  .guess input {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 52px;
    padding: 0 16px;
    border: 2px solid var(--line, #dfe6ed);
    border-radius: 14px;
    background: var(--surface, #fff);
    color: var(--ink, #172d45);
    font: inherit;
    font-size: 17px;
    font-weight: 700;
  }
  .guess input:focus-visible {
    outline: none;
    border-color: var(--focus, #2666b1);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--focus, #2666b1) 25%, transparent);
  }
  &[data-state='right'] .guess input {
    border-color: #2f9e58;
  }
  &[data-state='wrong'] .guess input {
    border-color: var(--red, #d94136);
    animation: quiz-shake 360ms ease-in-out;
  }
  .guess button {
    flex: none;
    min-height: 52px;
    padding: 0 18px;
    border: none;
    border-radius: 14px;
    background: var(--ink, #172d45);
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .guess button.skip {
    background: none;
    color: var(--muted);
    box-shadow: inset 0 0 0 2px var(--line, #dfe6ed);
  }
  .guess button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .guess button:focus-visible {
    outline: 3px solid var(--focus, #2666b1);
    outline-offset: 2px;
  }
  .shared {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .profile {
    background: none;
  }

  /* ── the stage: sunburst + silhouette ── */
  .stage {
    position: relative;
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 3;
    max-height: 420px;
    overflow: hidden;
    border-radius: var(--radius-card, 20px);
    background: radial-gradient(circle at 50% 46%, #6fd0ff 0, #1e5bb8 70%);
    box-shadow:
      inset 0 0 0 4px #ffda55,
      0 18px 34px rgba(23, 45, 69, 0.25);
    isolation: isolate;
  }
  .stage--empty {
    gap: 12px;
    color: #fff;
    font-weight: 600;
  }
  .burst {
    position: absolute;
    inset: -40%;
    z-index: -1;
    background: repeating-conic-gradient(
      from 0deg,
      rgba(255, 255, 255, 0.18) 0 7deg,
      transparent 7deg 18deg
    );
    animation: quiz-spin 40s linear infinite;
  }
  .mon {
    width: min(64%, 300px);
    height: auto;
    aspect-ratio: 1;
    object-fit: contain;
    /* who's that Pokémon: solid black with a thin cold rim */
    filter: brightness(0) drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.9))
      drop-shadow(0 0 22px rgba(160, 230, 255, 0.55));
    transform: rotate(-4deg);
    transition: filter 380ms ease-out;
    opacity: 0;
  }
  .mon[data-loaded] {
    opacity: 1;
    animation: quiz-enter 520ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  &[data-state='right'] .mon,
  &[data-state='wrong'] .mon {
    filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.35));
    animation: quiz-reveal 700ms ease-out;
  }
  .reveal {
    position: absolute;
    left: 6%;
    bottom: 8%;
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(26px, 7vw, 44px);
    line-height: 1 !important;
    text-transform: uppercase;
    color: var(--yellow, #ffda55);
    -webkit-text-stroke: 2px #2a4c8f;
    paint-order: stroke fill;
    text-shadow: 0 4px 0 #2a4c8f;
    transform: rotate(-6deg);
    animation: quiz-slam 520ms cubic-bezier(0.3, 1.6, 0.4, 1) 160ms both;
  }
  .cry {
    position: absolute;
    right: 12px;
    top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 14px 0 10px;
    border: none;
    border-radius: 999px;
    background: rgba(10, 30, 70, 0.55);
    color: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .cry svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .cry:focus-visible {
    outline: 2px solid var(--yellow, #ffda55);
    outline-offset: 2px;
  }

  /* ── options ── */
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
  }
  .options button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 56px;
    padding: 8px 14px 8px 8px;
    border: 2px solid var(--line, #dfe6ed);
    border-radius: 14px;
    background: var(--surface, #fff);
    color: var(--ink, #172d45);
    font: inherit;
    font-size: 16px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 3px 0 var(--line, #dfe6ed);
    transition:
      transform 120ms ease-out,
      border-color 120ms ease-out,
      box-shadow 120ms ease-out;
    animation: quiz-option 360ms cubic-bezier(0.16, 1, 0.3, 1)
      calc(var(--i) * 50ms) both;
  }
  .options button:hover:not(:disabled) {
    border-color: #2a4c8f;
    transform: translateY(-2px);
    box-shadow: 0 5px 0 #2a4c8f;
  }
  .options button:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow: 0 1px 0 #2a4c8f;
  }
  .options button:focus-visible {
    outline: 3px solid var(--focus, #2666b1);
    outline-offset: 2px;
  }
  .options button:disabled {
    cursor: default;
  }
  .options kbd {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: var(--canvas, #f3f6fa);
    font: inherit;
    font-size: 14px;
    color: var(--muted);
  }
  .options button[data-state='answer'] {
    border-color: #2f9e58;
    background: #e3f6ea;
    box-shadow: 0 3px 0 #2f9e58;
  }
  .options button[data-state='answer'] kbd {
    background: #2f9e58;
    color: #fff;
  }
  .options button[data-state='miss'] {
    border-color: var(--red, #d94136);
    background: #fde8e6;
    box-shadow: 0 3px 0 var(--red, #d94136);
    animation: quiz-shake 360ms ease-in-out;
  }
  .options button[data-state='dim'] {
    opacity: 0.55;
  }

  /* ── result ── */
  .result {
    min-height: 104px;
    margin-top: 14px;
  }
  .result p {
    margin: 0 0 10px;
    font-size: 16px;
    line-height: 1.5;
  }
  &[data-state='right'] .result strong {
    color: #2f9e58;
  }
  &[data-state='wrong'] .result strong {
    color: var(--red, #d94136);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .next,
  .profile {
    display: inline-flex;
    align-items: center;
    min-height: 48px;
    padding: 0 20px;
    border-radius: 999px;
    font: inherit;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }
  .next {
    border: none;
    background: var(--red, #d94136);
    color: #fff;
    box-shadow: 0 3px 0 #a3220a;
  }
  .profile {
    border: 2px solid var(--ink, #172d45);
    color: var(--ink, #172d45);
  }
  .next:focus-visible,
  .profile:focus-visible {
    outline: 3px solid var(--focus, #2666b1);
    outline-offset: 2px;
  }

  @keyframes quiz-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes quiz-enter {
    from {
      transform: rotate(-4deg) translateY(16px) scale(0.92);
      opacity: 0;
    }
  }
  @keyframes quiz-reveal {
    0% {
      filter: brightness(4) saturate(0);
      transform: rotate(-4deg) scale(1.06);
    }
    100% {
      filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.35));
      transform: rotate(-4deg);
    }
  }
  @keyframes quiz-slam {
    from {
      opacity: 0;
      transform: rotate(-6deg) translateX(-30px) scale(1.6);
    }
    to {
      opacity: 1;
      transform: rotate(-6deg);
    }
  }
  @keyframes quiz-option {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @keyframes quiz-shake {
    20%,
    60% {
      transform: translateX(-5px);
    }
    40%,
    80% {
      transform: translateX(5px);
    }
  }
  @keyframes quiz-pop {
    40% {
      transform: scale(1.5);
      color: var(--red, #d94136);
    }
  }

  @media (max-width: 480px) {
    .options button {
      font-size: 15px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    .mon[data-loaded],
    .burst {
      animation: none !important;
      transition: none !important;
    }
  }
`
