import { PokemonInfoCellStyle, PokemonInfoStyle, TitleStyle } from './styles'

const PokemonInfo = (props) => {
  const { height = '', weight = '', abilities = [] } = props

  const abilitiesList = abilities.map((item, idx) => {
    if (!item.ability || !item.ability.name) return null

    const className = idx !== abilities.length - 1 ? 'border-right' : ''

    return (
      <PokemonInfoCellStyle key={item.ability.name} className={className}>
        {item.ability.name}
      </PokemonInfoCellStyle>
    )
  })

  return (
    <>
      <PokemonInfoStyle $columns={2} className="is-table">
        <PokemonInfoCellStyle className="border-right border-bottom">
          <TitleStyle>Chiều cao</TitleStyle>
        </PokemonInfoCellStyle>
        <PokemonInfoCellStyle className="border-bottom">
          <TitleStyle>Cân nặng</TitleStyle>
        </PokemonInfoCellStyle>
        <PokemonInfoCellStyle className="border-right">
          {height}
        </PokemonInfoCellStyle>
        <PokemonInfoCellStyle>{weight}</PokemonInfoCellStyle>
      </PokemonInfoStyle>

      <PokemonInfoStyle $columns={1} className="is-table">
        <PokemonInfoCellStyle className="border-bottom">
          <TitleStyle>Khả năng đặc biệt</TitleStyle>
        </PokemonInfoCellStyle>
        <PokemonInfoStyle $columns={abilitiesList.length}>
          {abilitiesList}
        </PokemonInfoStyle>
      </PokemonInfoStyle>
    </>
  )
}

export default PokemonInfo
