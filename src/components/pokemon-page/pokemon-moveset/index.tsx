import {
  PokemonMovesetCellStyle,
  PokemonMovesetStyle,
  TitleStyle,
} from './styles'

const PokemonMoveset = (props) => {
  const { moveset = [] } = props

  const movesetList = moveset.map((item, idx) => {
    if (!item.move || !item.move.name) return null

    const className = idx !== moveset.length - 1 ? 'border-bottom' : ''

    return (
      <PokemonMovesetStyle key={item.move.name} $columns={2}>
        <PokemonMovesetCellStyle className={`${className} border-right`}>
          {item.move.name}
        </PokemonMovesetCellStyle>
        <PokemonMovesetCellStyle className={className}>
          {item.version_group_details?.[0]?.level_learned_at}
        </PokemonMovesetCellStyle>
      </PokemonMovesetStyle>
    )
  })

  return (
    <PokemonMovesetStyle $columns={1} className="is-table">
      <PokemonMovesetCellStyle className="border-bottom">
        <TitleStyle>Chiêu thức (Moveset)</TitleStyle>
      </PokemonMovesetCellStyle>
      <PokemonMovesetStyle $columns={2}>
        <PokemonMovesetCellStyle className="border-bottom">
          <TitleStyle>Tên</TitleStyle>
        </PokemonMovesetCellStyle>
        <PokemonMovesetCellStyle className="border-bottom">
          <TitleStyle>Level</TitleStyle>
        </PokemonMovesetCellStyle>
      </PokemonMovesetStyle>
      {movesetList}
    </PokemonMovesetStyle>
  )
}

export default PokemonMoveset
