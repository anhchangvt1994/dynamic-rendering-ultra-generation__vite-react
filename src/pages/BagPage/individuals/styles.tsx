import { dialogCss } from 'pages/QuizPage/useModal'
import styled from 'styled-components'

export const DialogStyle = styled.dialog`
  ${dialogCss}
  --dialog-w: 460px;
  .ind-panel {
    position: relative;
    display: grid;
    gap: 12px;
    justify-items: center;
    max-height: calc(100svh - 24px);
    overflow: hidden auto;
    scrollbar-width: none;
    padding: 28px 18px 20px;
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
  h2 {
    margin: 0;
    font-size: 20px;
  }
  p {
    margin: 0;
    line-height: 1.45;
  }
  .ind-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .ind-btn {
    font: inherit;
    font-weight: 700;
    min-height: 44px;
    min-width: 88px;
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
  .ind-btn[disabled],
  .ind-btn[aria-disabled='true'] {
    cursor: default;
    opacity: 0.6;
  }
  .ind-primary {
    color: #4a2706;
    border-color: #a45a12;
    background: linear-gradient(180deg, #ffe7a0, #f2a93b);
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
  .ind-stage {
    position: relative;
    display: grid;
    place-items: center;
    width: 180px;
    height: 180px;
  }
  .ind-stage .ind-shell {
    position: absolute;
    inset: 24px;
    animation: ind-break 850ms ease-in forwards;
    pointer-events: none;
  }
  .ind-stage .ind-art {
    animation: ind-out 850ms ease-out;
  }
  @keyframes ind-break {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    55% {
      opacity: 1;
      transform: scale(1.08) rotate(-3deg);
    }
    100% {
      opacity: 0;
      transform: scale(1.5);
    }
  }
  @keyframes ind-out {
    0%,
    45% {
      opacity: 0;
      transform: scale(0.6);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
  .ind-facts {
    display: grid;
    gap: 4px;
    justify-items: center;
  }
  .ind-stars {
    font-size: 18px;
    letter-spacing: 2px;
    color: #ffd447;
  }
  .ind-field {
    display: grid;
    gap: 6px;
    width: min(100%, 280px);
    text-align: left;
    font-size: 13px;
  }
  .ind-field label {
    text-align: center;
    margin-bottom: 12px;
  }
  .ind-field input {
    font: inherit;
    font-size: 16px;
    min-height: 44px;
    padding: 8px 12px;
    border-radius: 12px;
    border: 2px solid rgba(255, 231, 160, 0.5);
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
  }
  .ind-count {
    justify-self: end;
    opacity: 0.75;
  }
  .ind-error {
    color: #ffb4a8;
    font-size: 13px;
  }
  .ind-list {
    list-style: none;
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    width: 100%;
  }
  .ind-results {
    max-height: min(52svh, 420px);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: none;
  }
  .ind-panel::-webkit-scrollbar,
  .ind-results::-webkit-scrollbar {
    display: none;
  }
  .ind-item {
    position: relative;
    display: grid;
    grid-template-columns: 72px 1fr;
    gap: 4px 12px;
    align-items: center;
    padding: 10px;
    border-radius: 16px;
    text-align: left;
    background: rgba(255, 255, 255, 0.07);
  }
  .ind-item .ind-art {
    grid-row: span 2;
  }
  .ind-item-main {
    display: grid;
    gap: 2px;
    font-size: 13px;
    min-width: 0;
  }
  .ind-item-main strong {
    font-size: 15px;
    overflow-wrap: anywhere;
  }
  .ind-item-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .ind-close {
    min-width: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .ind-stage .ind-shell {
      display: none;
    }
  }
`
