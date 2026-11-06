import styled from 'styled-components'

export const MyPokemonStyle = styled.div`
  --gold: #ffe7a0;
  --amber: #f2a93b;
  min-height: calc(100dvh - 64px);
  padding: 24px 16px 120px;
  color: #fff;
  background:
    radial-gradient(
      70% 40% at 50% 0,
      rgba(242, 169, 59, 0.28),
      transparent 70%
    ),
    #0b1a2f;

  > * {
    max-width: 960px;
    margin-inline: auto;
  }
  &[data-room] {
    min-height: 0;
    padding: 0;
    background: none;
  }
  &[data-room] > * {
    max-width: none;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 26px;
  }
  .mp-sub {
    margin: 0 0 20px;
    opacity: 0.75;
  }
  .mp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 0;
    margin: 0;
    list-style: none;
  }
  .mp-card {
    display: grid;
    gap: 6px;
    justify-items: center;
    padding: 14px 10px;
    border-radius: 20px;
    text-align: center;
    color: inherit;
    text-decoration: none;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 2px rgba(255, 224, 138, 0.28);
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }
  .mp-card:hover,
  .mp-card:focus-visible {
    transform: translateY(-3px);
    box-shadow: inset 0 0 0 2px rgba(255, 224, 138, 0.7);
  }
  .ind-art {
    position: relative;
    display: inline-grid;
    place-items: center;
    flex: none;
  }
  .ind-art img,
  .ind-art svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .ind-letter {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    font-size: 44px;
    font-weight: 800;
    color: #4a2706;
    background: linear-gradient(180deg, #ffe7a0, #f2a93b);
  }
  .mp-card small {
    opacity: 0.75;
  }
  .mp-stars {
    color: #ffd447;
    letter-spacing: 2px;
  }
  .mp-back {
    display: inline-block;
    margin-bottom: 16px;
    color: var(--gold);
  }
  .mp-detail {
    display: grid;
    gap: 14px;
    justify-items: center;
    max-width: 520px;
    padding: 28px 18px 24px;
    border-radius: 26px;
    text-align: center;
    background:
      radial-gradient(
        90% 55% at 50% 22%,
        rgba(255, 190, 70, 0.3),
        transparent 70%
      ),
      #0b1a2f;
    box-shadow:
      inset 0 0 0 2px rgba(255, 224, 138, 0.5),
      0 30px 90px -20px rgba(242, 169, 59, 0.5);
  }
  .mp-detail h1,
  .mp-detail p {
    margin: 0;
  }
  .mp-facts {
    display: grid;
    gap: 4px;
  }
  .mp-field {
    display: grid;
    gap: 6px;
    justify-items: center;
  }
  .mp-field input {
    font: inherit;
    min-height: 44px;
    padding: 8px 14px;
    border-radius: 14px;
    border: 2px solid rgba(255, 231, 160, 0.5);
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
  .mp-error {
    min-height: 1.2em;
    color: #ffb3b3;
  }
  .mp-error[data-ok] {
    color: #b8f0c0;
  }
  .mp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .mp-btn {
    font: inherit;
    font-weight: 700;
    min-height: 44px;
    padding: 8px 18px;
    border-radius: 999px;
    border: 2px solid rgba(255, 231, 160, 0.5);
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    text-decoration: none;
    display: inline-grid;
    place-items: center;
  }
  .mp-primary {
    color: #4a2706;
    border-color: #a45a12;
    background: linear-gradient(180deg, #ffe7a0, #f2a93b);
  }
  .mp-note {
    display: grid;
    gap: 10px;
    justify-items: center;
    max-width: 440px;
    margin-top: 8vh;
    padding: 28px 20px;
    border-radius: 24px;
    text-align: center;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 0 0 1px rgba(255, 224, 138, 0.22);
  }
  .mp-note p {
    margin: 0;
    opacity: 0.8;
  }
  .mp-note-icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    font-size: 26px;
    background: rgba(255, 224, 138, 0.14);
  }

  /* the room's shape while the list loads: no jump when it opens */
  .mp-room-skel {
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 10px;
    min-height: calc(100dvh - 64px);
    padding: 8px 12px 0;
    background: #111;
  }
  .mp-skel {
    display: block;
    border-radius: 999px;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.08),
        transparent
      )
      0 0 / 200% 100%,
      rgba(255, 255, 255, 0.07);
  }
  @media (prefers-reduced-motion: no-preference) {
    .mp-skel {
      animation: mp-shimmer 1.4s linear infinite;
    }
  }
  @keyframes mp-shimmer {
    to {
      background-position: -200% 0, 0 0;
    }
  }
  .mp-skel-head {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-self: stretch;
    margin-top: 6px;
  }
  .mp-skel-back {
    flex: none;
    width: 56px;
    height: 56px;
  }
  .mp-skel-name {
    width: min(220px, 60%);
    height: 56px;
  }
  .mp-skel-needs,
  .mp-skel-dock {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    width: 100%;
  }
  .mp-skel-needs .mp-skel {
    height: 46px;
    border-radius: 14px;
  }
  .mp-skel-disc {
    width: clamp(150px, min(100vw - 72px, 100dvh - 470px), 300px);
    height: auto;
    aspect-ratio: 1;
    margin-top: auto;
    margin-block: 12vh 0;
    border-radius: 50%;
  }
  .mp-skel-dock {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
    max-width: 544px;
    margin-inline: auto;
    grid-template-columns: repeat(4, 1fr);
  }
  .mp-skel-dock .mp-skel {
    height: 64px;
    border-radius: 16px;
  }
  @media (min-width: 960px) {
    .mp-room-skel {
      padding: 12px max(20px, calc((100% - 1320px) / 2));
    }
    .mp-skel-back {
      width: 150px;
      height: 58px;
    }
    .mp-skel-name {
      height: 70px;
    }
    .mp-skel-disc {
      width: clamp(220px, calc(100dvh - 515px), 400px);
    }
    .mp-skel-needs {
      max-width: 520px;
      justify-self: start;
    }
  }
`
