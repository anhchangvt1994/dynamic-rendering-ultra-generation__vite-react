export const PokemonInfoStyle = styled.div<{ $columns: number }>`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$columns || 3}, 1fr);
  gap: 8px;
  color: #ffffff;

  &.is-table {
    margin-top: 16px;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  }
`

export const PokemonInfoCellStyle = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;

  &.border-right {
    &:before {
      content: '';
      position: absolute;
      height: calc(100% - 16px);
      width: 1px;
      top: 0;
      bottom: 0;
      right: -4px;
      margin: auto 0;
      ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    }
  }

  &.border-bottom {
    &:after {
      content: '';
      position: absolute;
      width: 100%;
      height: 1px;
      bottom: -4px;
      ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    }
  }
`

export const TitleStyle = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`

export const AbilitiesStyle = styled.section`
  margin-top: 16px;
  padding: 12px 14px;
  color: #fff;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}

  h3 {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 700;
    text-align: center;
  }
  details {
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
  details:first-of-type {
    border-top: none;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::after {
    content: '';
    width: 8px;
    height: 8px;
    margin-left: auto;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    transition: transform 160ms ease-out;
    opacity: 0.7;
  }
  details[open] summary::after {
    transform: rotate(-135deg);
  }
  summary:focus-visible {
    outline: 2px solid #ffda55;
    outline-offset: 2px;
    border-radius: 6px;
  }
  .ability-name {
    font-weight: 700;
  }
  .hidden-badge {
    padding: 1px 8px;
    border-radius: 999px;
    background: rgba(255, 218, 85, 0.18);
    box-shadow: inset 0 0 0 1px rgba(255, 218, 85, 0.6);
    color: #ffda55;
    font-size: 12px;
    font-weight: 700;
  }
  .ability-text {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.55;
    color: rgba(235, 247, 241, 0.85);
  }
`
