// An open Poké Ball: the red cap holds the title, the band's button sits on
// the seam (it wobbles like a catch while a request runs), the white base
// holds the form.
export const AccountPageStyle = styled.div`
  min-height: 100%;
  padding: 48px 18px 72px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background:
    radial-gradient(
      120% 60% at 50% 0%,
      rgba(217, 65, 54, 0.08),
      transparent 70%
    ),
    var(--canvas);

  .card {
    width: 100%;
    max-width: 440px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 28px;
    overflow: hidden;
    box-shadow: 0 18px 50px -24px rgba(23, 45, 69, 0.35);
  }

  .cap {
    position: relative;
    padding: 26px 24px 46px;
    color: #fff;
    background:
      radial-gradient(
        60% 90% at 18% 0%,
        rgba(255, 255, 255, 0.28),
        transparent 60%
      ),
      linear-gradient(180deg, #ef5a4a 0%, var(--red) 55%, #b92f25 100%);
  }
  .eyebrow {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2.5px;
    opacity: 0.85;
  }
  h1 {
    margin: 6px 0 6px;
    font-size: 26px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: -0.5px;
  }
  .cap p {
    margin: 0;
    font-size: 14px;
    line-height: 1.5;
    opacity: 0.92;
    overflow-wrap: anywhere;
  }

  /* the band and its button */
  .seam {
    position: relative;
    height: 6px;
    background: var(--ink);
  }
  .knob {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 60px;
    height: 60px;
    margin: -30px 0 0 -30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: radial-gradient(circle at 38% 34%, #fff, #e6ecf2);
    border: 6px solid var(--ink);
    color: var(--ink);
    box-shadow: 0 6px 16px -6px rgba(23, 45, 69, 0.5);
  }
  .knob svg:not([width]) {
    width: 26px;
    height: 26px;
  }
  .knob.is-busy {
    animation: catch-wobble 1.1s ease-in-out infinite;
  }
  @keyframes catch-wobble {
    0%,
    100% {
      transform: rotate(0);
    }
    20% {
      transform: rotate(-16deg);
    }
    40% {
      transform: rotate(12deg);
    }
    55% {
      transform: rotate(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .knob.is-busy {
      animation: none;
      opacity: 0.7;
    }
  }

  .body {
    padding: 44px 24px 26px;
    color: var(--ink);
  }
  form,
  .signed-in {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    border-radius: 14px;
    background: var(--canvas);
    border: 1px solid var(--line);
  }
  .modes button {
    height: 40px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
    font-weight: 700;
    transition:
      background 160ms,
      color 160ms;
  }
  .modes button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 1px 4px rgba(23, 45, 69, 0.14);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .field > span:first-child {
    font-size: 13px;
    font-weight: 700;
  }
  .field small {
    color: var(--muted);
    font-size: 12px;
  }
  input {
    width: 100%;
    min-width: 0;
    height: 48px;
    padding: 0 14px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    color: var(--ink);
    /* 16px: iOS zooms into smaller inputs */
    font-size: 16px;
  }
  input:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 1px;
  }
  .password {
    position: relative;
    display: block;
  }
  .password input {
    padding-right: 64px;
  }
  .reveal {
    position: absolute;
    right: 4px;
    top: 4px;
    height: 40px;
    min-width: 52px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
  }
  .reveal:hover {
    background: var(--canvas);
    color: var(--ink);
  }
  input.code {
    height: 60px;
    text-align: center;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 0.45em;
    /* the spacing trails the last digit: pull the group back to centre */
    padding-left: calc(14px + 0.45em);
    font-variant-numeric: tabular-nums;
  }

  .primary,
  .secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 50px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 800;
    transition:
      transform 120ms,
      background 160ms;
  }
  .primary {
    border: 0;
    background: var(--ink);
    color: #fff;
  }
  .primary:hover:not(:disabled) {
    background: var(--ink-soft);
  }
  .primary:active:not(:disabled) {
    transform: scale(0.98);
  }
  .secondary {
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
  }
  .secondary:hover:not(:disabled) {
    background: var(--canvas);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 12px;
  }
  .text {
    min-height: 44px;
    padding: 0 2px;
    border: 0;
    background: none;
    color: var(--focus);
    font-size: 14px;
    font-weight: 700;
  }
  .text:hover:not(:disabled) {
    text-decoration: underline;
  }

  .hint {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }
  .hint.dev {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px dashed var(--line);
  }
  .message {
    margin: 0 0 16px;
    padding: 11px 14px;
    border-radius: 12px;
    background: var(--mint);
    font-size: 14px;
    line-height: 1.45;
  }
  .message.is-error {
    background: #fde8e6;
    color: #8f1f17;
  }

  .who {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    min-width: 0;
  }
  .who > span:last-child {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .who small {
    color: var(--muted);
    font-size: 12px;
  }
  .who strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .avatar {
    flex: none;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--yellow);
    font-weight: 800;
    font-size: 18px;
  }
  .count {
    margin: 0;
    padding: 14px 16px;
    border-radius: 14px;
    background: var(--mint);
    font-size: 14px;
  }
  .count strong {
    font-size: 22px;
    margin-right: 4px;
  }

  @media (max-width: 400px) {
    padding: 24px 12px 56px;
    .cap {
      padding: 22px 18px 42px;
    }
    .body {
      padding: 42px 18px 22px;
    }
    h1 {
      font-size: 23px;
    }
  }
`
