import {
  ImageStyle,
  ImageWrapperStyle,
  NameStyle,
  PokemonCardStyle,
} from './styles'

const PokemonCard = ({ pokemon }) => {
  const onLoad = (img) => {
    img.classList.add('show')
  }

  const onError = (img) => {
    img.classList.add('error')
  }

  return (
    <PokemonCardStyle>
      <ImageWrapperStyle>
        <ImageStyle
          alt={pokemon.name}
          onLoad={(e) => onLoad(e.target)}
          onError={(e) => onError(e.target)}
          src={`https://projectpokemon.org/images/normal-sprite/${getSlug(pokemon.name)}.gif`}
          height={60}
        />
      </ImageWrapperStyle>
      <NameStyle>{pokemon.name}</NameStyle>
    </PokemonCardStyle>
  )
}

export default PokemonCard
