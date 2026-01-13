import {
  PokemonStatsProgressBarInnerStyle,
  PokemonStatsProgressBarStyle,
  PokemonStatsRowStyle,
  PokemonStatsStyle,
  PokemonStatsTitleColStyle,
  PokemonStatsValueColStyle,
} from './styles'

const PokemonStats = (props) => {
  const { stats = [] } = props
  const statsInfo = stats?.length
    ? stats
    : import.meta.env.INFO_POKEMON_STATS_DEFAULT

  const statsList = statsInfo.map((item) => {
    const baseStat =
      item.base_stat === undefined || item.base_stat === null
        ? 0
        : item.base_stat
    const progressValue = `${
      (baseStat * 100) / import.meta.env.INFO_POKEMON_MAX_BASE_STATS
    }%`
    const progressColor = `${rgba(baseStat <= import.meta.env.INFO_POKEMON_STATS_LEVEL.bad ? import.meta.env.INFO_POKEMON_STATS_COLOR.bad : baseStat <= import.meta.env.INFO_POKEMON_STATS_LEVEL.normal ? import.meta.env.INFO_POKEMON_STATS_COLOR.normal : import.meta.env.INFO_POKEMON_STATS_COLOR.good, 0.6)}`

    return (
      <PokemonStatsRowStyle key={item.stat.name}>
        <PokemonStatsTitleColStyle>
          <span>{item.stat.name}</span>
          <span>{baseStat}</span>
        </PokemonStatsTitleColStyle>
        <PokemonStatsValueColStyle>
          <PokemonStatsProgressBarStyle>
            <PokemonStatsProgressBarInnerStyle
              style={{
                width: progressValue,
                background: progressColor,
              }}
            />
          </PokemonStatsProgressBarStyle>
        </PokemonStatsValueColStyle>
      </PokemonStatsRowStyle>
    )
  })

  return <PokemonStatsStyle>{statsList}</PokemonStatsStyle>
}

export default PokemonStats
