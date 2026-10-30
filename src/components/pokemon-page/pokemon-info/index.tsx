import { useGetAbilityQuery } from 'app/apis/pokemon'
import { useState } from 'react'
import {
  abilityText,
  formatHeight,
  formatWeight,
  titleCase,
} from '../format.mjs'
import {
  AbilitiesStyle,
  PokemonInfoCellStyle,
  PokemonInfoStyle,
  TitleStyle,
} from './styles'

// One ability: name, a "Ẩn" badge for hidden abilities, and its effect,
// fetched only once the reader opens it.
function AbilityItem({ name, hidden }: { name: string; hidden: boolean }) {
  const [open, setOpen] = useState(false)
  const { data, isFetching, isError } = useGetAbilityQuery(name, {
    skip: !open,
  })
  const text = abilityText(data)
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="ability-name">{titleCase(name)}</span>
        {hidden && (
          <span className="hidden-badge" title="Khả năng ẩn">
            Ẩn
          </span>
        )}
      </summary>
      <p className="ability-text">
        {isError ? (
          'Chưa tải được mô tả. Đóng và mở lại để thử lại.'
        ) : isFetching && !data ? (
          'Đang tra Pokédex…'
        ) : text ? (
          <span lang="en">{text}</span>
        ) : (
          'Chưa có mô tả cho khả năng này.'
        )}
      </p>
    </details>
  )
}

const PokemonInfo = (props) => {
  const { height = '', weight = '', abilities = [] } = props

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
          {formatHeight(height)}
        </PokemonInfoCellStyle>
        <PokemonInfoCellStyle>{formatWeight(weight)}</PokemonInfoCellStyle>
      </PokemonInfoStyle>

      <AbilitiesStyle aria-labelledby="abilities-heading">
        <h3 id="abilities-heading">Khả năng đặc biệt</h3>
        {abilities
          .filter((item) => item?.ability?.name)
          .map((item) => (
            <AbilityItem
              key={item.ability.name}
              name={item.ability.name}
              hidden={!!item.is_hidden}
            />
          ))}
      </AbilitiesStyle>
    </>
  )
}

export default PokemonInfo
