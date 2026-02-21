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
