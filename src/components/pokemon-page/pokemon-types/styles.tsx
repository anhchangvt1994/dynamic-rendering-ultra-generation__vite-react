export const TypesWrapperStyle = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  min-height: 28px;
  margin: -2px 0 14px;
`

// A type badge in the game's colour: icon puck + Vietnamese name.
export const TypeChipStyle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px 3px 3px;
  border-radius: 999px;
  background: var(--type);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -2px 0 rgba(0, 0, 0, 0.2),
    0 3px 8px rgba(0, 0, 0, 0.25);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);
  animation: type-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;

  &:nth-child(2) {
    animation-delay: 80ms;
  }

  @keyframes type-in {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const ImageStyle = styled.img`
  width: 22px;
  height: 22px;
  padding: 2px;
  border-radius: 50%;
  background: #fff;
  object-fit: contain;
`
