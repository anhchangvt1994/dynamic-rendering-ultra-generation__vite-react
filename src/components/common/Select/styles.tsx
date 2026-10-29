import * as SelectPrimitive from '@radix-ui/react-select'
import styled from 'styled-components'

export const TriggerStyle = styled(SelectPrimitive.Trigger)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  width: 100%;
  height: 50px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  transition:
    border-color 140ms,
    box-shadow 140ms;
  .select-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .select-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    color: var(--muted);
    transition: transform 140ms;
  }
  &:hover:not(:disabled) {
    border-color: #aebfce;
  }
  &[data-state='open'] {
    border-color: var(--focus);
    box-shadow: 0 0 0 3px #2666b112;
  }
  &[data-state='open'] .select-chevron {
    transform: rotate(180deg);
  }
  &:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 3px;
  }
  @media (max-width: 680px) {
    height: 44px;
    font-size: 11px;
  }
`

export const ContentStyle = styled(SelectPrimitive.Content)`
  display: flex;
  flex-direction: column;
  z-index: 70;
  width: var(--radix-select-trigger-width);
  max-height: min(330px, var(--radix-select-content-available-height));
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 5px;
  background: var(--surface);
  color: var(--ink);
  box-shadow:
    0 12px 32px #172d451a,
    0 2px 6px #172d4508;
  font-family: var(--font-body);
  transform-origin: var(--radix-select-content-transform-origin);
  animation: select-reveal 120ms ease-out;
  .select-viewport {
    min-height: 0;
    max-height: min(
      318px,
      calc(var(--radix-select-content-available-height) - 12px)
    );
    overscroll-behavior-y: contain;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: auto;
  }
  @keyframes select-reveal {
    from {
      opacity: 0;
      transform: translateY(-3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const ItemStyle = styled(SelectPrimitive.Item)`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 42px;
  padding: 9px 8px;
  border-radius: 7px;
  color: var(--ink);
  outline: none;
  font-size: 11px;
  cursor: pointer;
  user-select: none;
  .select-option-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 1px;
  }
  .select-option-copy > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
  }
  .select-description {
    font-size: 9px;
    color: var(--muted);
  }
  .select-check {
    display: flex;
    flex: 0 0 16px;
    color: #326a50;
  }
  &[data-state='checked'] {
    background: #edf6f0;
  }
  &[data-highlighted] {
    background: var(--ink);
    color: white;
  }
  &[data-highlighted] .select-description {
    color: #b8ccdd;
  }
  &[data-highlighted] .select-check {
    color: var(--yellow);
  }
  &[data-disabled] {
    color: var(--muted);
    opacity: 0.5;
    pointer-events: none;
  }
`
