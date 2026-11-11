import styled from 'styled-components'

export const QuestStyle = styled.section`
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;

  &[data-guest] {
    opacity: 0.6;
  }
  h2 {
    margin: 0 0 10px;
    font-size: 18px;
  }
  .qc-list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .qc-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 12px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.05);
    animation: qc-in 200ms ease both;
  }
  .qc-row[data-state='claimed'] {
    opacity: 0.5;
  }
  .qc-row small {
    grid-column: 1;
    opacity: 0.75;
  }
  .qc-bar {
    grid-column: 1 / -1;
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.14);
    overflow: hidden;
  }
  .qc-bar i {
    display: block;
    height: 100%;
    background: #ffd0dc;
    transition: width 300ms ease;
  }
  .qc-go,
  .qc-ok {
    min-height: 44px;
    min-width: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 12px;
    font: inherit;
    font-weight: 700;
    color: #0b1a2f;
    background: #ffd0dc;
    cursor: pointer;
  }
  .qc-go:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .qc-go:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
  .qc-ok {
    display: grid;
    place-items: center;
    color: #fff;
    background: none;
  }
  .qc-streak {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }
  .qc-dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.16);
  }
  .qc-dot[data-on] {
    background: #ffd0dc;
  }
  .qc-dot[data-big] {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    font-size: 15px;
  }
  .qc-note {
    margin: 8px 0 0;
    font-size: 13px;
    opacity: 0.8;
  }
  .qc-error {
    margin: 8px 0 0;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 14px;
    background: rgba(255, 90, 90, 0.2);
  }
  .mg-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }
  .mg-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px 4px 6px;
    border-radius: 999px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.12);
  }
  .mg-chip img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }
  .mg-cta {
    min-height: 44px;
    padding: 0 18px;
    border: 0;
    border-radius: 14px;
    font: inherit;
    font-weight: 700;
    color: #0b1a2f;
    background: #ffd0dc;
    cursor: pointer;
  }
  .mg-fly {
    animation: qc-in 400ms ease both;
  }
  .mg-chest-box {
    display: inline-block;
  }
  @keyframes qc-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .qc-row,
    .mg-fly,
    .qc-bar i {
      animation: none;
      transition: none;
    }
  }
`
