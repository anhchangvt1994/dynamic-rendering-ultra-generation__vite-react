import styled from 'styled-components'

// The page shell, shared by the page and its skeleton so the two hand over
// without a shift. The play surface itself lives in styles.tsx (SheetStyle).
export const MiniGamePageStyle = styled.div`
  min-height: calc(100dvh - 64px);
  padding: 28px 16px 120px;
  color: #fff;
  background:
    radial-gradient(60% 36% at 50% 0, rgba(255, 120, 150, 0.22), transparent 70%),
    radial-gradient(40% 30% at 90% 20%, rgba(90, 160, 255, 0.18), transparent 70%),
    #0b1a2f;

  > * {
    max-width: 960px;
    margin-inline: auto;
  }
  .mgp-kicker {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #ffc9d6;
    min-height: 16px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 30px;
    line-height: 38px;
  }
  .mgp-sub {
    margin: 0 0 22px;
    min-height: 24px;
    line-height: 24px;
    opacity: 0.78;
  }
  .mgp-note {
    margin: 0 auto 18px;
    padding: 12px 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.08);
    line-height: 22px;
  }
  .mgp-note a {
    color: #ffe7a0;
    font-weight: 700;
  }
  .mgp-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 14px;
    margin: 0 auto;
    padding: 0;
    list-style: none;
  }
  .mgp-card {
    display: grid;
    gap: 10px;
    align-content: start;
    min-height: 196px;
    padding: 18px;
    border-radius: 22px;
    background: linear-gradient(160deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05));
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
  }
  .mgp-card h2 {
    margin: 0;
    font-size: 20px;
    line-height: 26px;
  }
  .mgp-card p {
    margin: 0;
    min-height: 44px;
    line-height: 22px;
    opacity: 0.8;
  }
  .mgp-turns {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 22px;
    font-size: 14px;
  }
  .mgp-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
  }
  .mgp-dot[data-on] {
    background: #ff8fa9;
    box-shadow: 0 0 10px rgba(255, 143, 169, 0.7);
  }
  .mgp-play {
    min-height: 48px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-weight: 800;
    color: #3a0d1a;
    background: linear-gradient(180deg, #ffd0dc, #ff8fa9);
    cursor: pointer;
  }
  .mgp-play:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .mgp-play:active {
    transform: translateY(1px);
  }
  .bone {
    --bone: rgba(255, 255, 255, 0.08);
    --shine: rgba(255, 255, 255, 0.17);
  }
  @media (prefers-reduced-motion: reduce) {
    .mgp-play:active {
      transform: none;
    }
  }
`
