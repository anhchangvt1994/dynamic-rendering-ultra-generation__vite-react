import { useGetPokemonDetailQuery } from 'app/apis/pokemon'
import {
  BodyStyle,
  HeaderStyle,
  ImageStyle,
  ImageWrapperStyle,
  NameLoadingStyle,
  NameStyle,
  PokemonPageStyle,
} from './styles'

const PokemonPage = () => {
  const route = useRoute()
  const { name } = route.params
  const { data, isFetching } = useGetPokemonDetailQuery(name)
  const pokemonNumber = data?.id ? data.id.toString().padStart(3, '0') : ''
  const isShowLoading = RenderingInfo.loader || isFetching

  const onLoad = (img) => {
    img.classList.add('show')
  }

  const onError = (img) => {
    img.classList.add('error')
  }

  return (
    <PokemonPageStyle>
      <HeaderStyle></HeaderStyle>
      <BodyStyle>
        <ImageWrapperStyle>
          {!isShowLoading && (
            <ImageStyle
              src={`https://www.pokemon.com/static-assets/content-assets/cms2/img/pokedex/full/${pokemonNumber}.png`}
              onLoad={(e) => onLoad(e.target)}
              onError={(e) => onError(e.target)}
              alt={name}
            />
          )}
        </ImageWrapperStyle>
        {isShowLoading ? (
          <NameLoadingStyle>
            <div className="stage">
              <div className="dot-flashing"></div>
            </div>
          </NameLoadingStyle>
        ) : (
          <NameStyle>{name}</NameStyle>
        )}
      </BodyStyle>
    </PokemonPageStyle>
  )
}

export default PokemonPage
