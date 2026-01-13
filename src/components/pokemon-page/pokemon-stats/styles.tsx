export const PokemonStatsStyle = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const PokemonStatsRowStyle = styled.div`
  display: flex;
  flex-wrap: wrap;
  column-gap: 8px;
`

export const PokemonStatsTitleColStyle = styled.div`
  display: flex;
  width: 100%;
  color: #ffffff;
  text-transform: capitalize;
  justify-content: space-between;
`

export const PokemonStatsValueColStyle = styled.div`
  width: 100%;
`

export const PokemonStatsProgressBarStyle = styled.div`
  margin-top: 4px;
  width: 100%;
  height: 16px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
`

export const PokemonStatsProgressBarInnerStyle = styled.div`
  height: 100%;
  width: 0;
  transition: width ease 0.3s;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
`
