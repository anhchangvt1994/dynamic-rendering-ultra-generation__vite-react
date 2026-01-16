import {
  PokemonStatsProgressBarStyle,
  PokemonStatsRowStyle,
  PokemonStatsStyle,
  PokemonStatsTitleColStyle,
  PokemonStatsValueColStyle,
} from './styles'

const PokemonStatsLoading = () => {
  const statsList = useMemo(
    () =>
      import.meta.env.INFO_POKEMON_STATS_DEFAULT.map((item) => (
        <PokemonStatsRowStyle key={item.stat.name}>
          <PokemonStatsTitleColStyle>
            <span>{item.stat.name}</span>
          </PokemonStatsTitleColStyle>
          <PokemonStatsValueColStyle>
            <PokemonStatsProgressBarStyle />
          </PokemonStatsValueColStyle>
        </PokemonStatsRowStyle>
      )),
    []
  )

  return <PokemonStatsStyle>{statsList}</PokemonStatsStyle>
}

export default PokemonStatsLoading
