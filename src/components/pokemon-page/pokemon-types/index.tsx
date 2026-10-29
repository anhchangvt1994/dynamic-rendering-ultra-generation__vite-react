import type { CSSProperties } from 'react'
import { ImageStyle, TypeChipStyle, TypesWrapperStyle } from './styles'

import { TYPE_DATA as TYPES } from '../type-data.mjs'

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
