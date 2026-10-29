import { sortMoves, titleCase } from '../format.mjs'
import {
  PokemonMovesetCellStyle,
  PokemonMovesetStyle,
  TitleStyle,
} from './styles'

const PokemonMoveset = (props) => {
  const { moveset = [] } = props

  const sorted = sortMoves(moveset)
  const movesetList = sorted.map(({ entry, learning }, idx) => {
    const className = idx !== sorted.length - 1 ? 'border-bottom' : ''

    return (
      <PokemonMovesetStyle key={entry.move.name} $columns={2}>
        <PokemonMovesetCellStyle className={`${className} border-right`}>
          {titleCase(entry.move.name)}
        </PokemonMovesetCellStyle>
        <PokemonMovesetCellStyle className={className}>
          {learning.label}
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
          <TitleStyle>Cách học</TitleStyle>
        </PokemonMovesetCellStyle>
      </PokemonMovesetStyle>
      {movesetList}
    </PokemonMovesetStyle>
  )
}

export default PokemonMoveset
