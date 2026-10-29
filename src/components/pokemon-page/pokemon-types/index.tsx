import type { CSSProperties } from 'react'
import { ImageStyle, TypeChipStyle, TypesWrapperStyle } from './styles'

// In-game type colours and Vietnamese names.
const TYPES: Record<string, { label: string; color: string }> = {
  normal: { label: 'Thường', color: '#9fa19f' },
  fire: { label: 'Lửa', color: '#e62829' },
  water: { label: 'Nước', color: '#2980ef' },
  electric: { label: 'Điện', color: '#d6a700' },
  grass: { label: 'Cỏ', color: '#3fa129' },
  ice: { label: 'Băng', color: '#2fb4d6' },
  fighting: { label: 'Giác đấu', color: '#ff8000' },
  poison: { label: 'Độc', color: '#9141cb' },
  ground: { label: 'Đất', color: '#915121' },
  flying: { label: 'Bay', color: '#5f8fd6' },
  psychic: { label: 'Siêu linh', color: '#ef4179' },
  bug: { label: 'Bọ', color: '#7f8f10' },
  rock: { label: 'Đá', color: '#9a8a52' },
  ghost: { label: 'Ma', color: '#704170' },
  dragon: { label: 'Rồng', color: '#5060e1' },
  dark: { label: 'Bóng tối', color: '#50413f' },
  steel: { label: 'Thép', color: '#5f97ad' },
  fairy: { label: 'Tiên', color: '#ef70ef' },
}

const PokemonTypes = (props) => {
  const { types = [] } = props
  // keeps its height while empty (loading) so the page below does not jump
  if (!types.length) return <TypesWrapperStyle aria-hidden="true" />

  return (
    <TypesWrapperStyle aria-label="Hệ">
      {types.map(({ type }) => {
        const info = TYPES[type.name] ?? { label: type.name, color: '#777' }
        return (
          <TypeChipStyle
            key={type.name}
            style={{ '--type': info.color } as CSSProperties}
          >
            <ImageStyle
              src={`/images/pokemon-types_${type.name}.webp`}
              alt=""
              width={18}
              height={18}
            />
            {info.label}
          </TypeChipStyle>
        )
      })}
    </TypesWrapperStyle>
  )
}

export default PokemonTypes
