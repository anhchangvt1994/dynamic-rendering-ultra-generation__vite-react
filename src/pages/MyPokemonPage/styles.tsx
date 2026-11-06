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
`
