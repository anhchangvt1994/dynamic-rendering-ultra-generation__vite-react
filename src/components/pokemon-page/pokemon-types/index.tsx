import { ImageStyle, ImageWrapperStyle, TypesWrapperStyle } from './styles'

const PokemonTypes = (props) => {
  const { types = [] } = props

  const typesList = types.length
    ? types.map((item) => (
        <ImageWrapperStyle key={item.type.name}>
          <ImageStyle
            src={`/images/pokemon-types_${item.type.name}.webp`}
            alt={item.type.name}
          />
        </ImageWrapperStyle>
      ))
    : null

  return <TypesWrapperStyle>{typesList}</TypesWrapperStyle>
}

export default PokemonTypes
