import Image from 'components/common/Image'
import { functionGenerator } from 'utils/EnvHelper'
import {
  ImageColStyle,
  InfoColStyle,
  NameStyle,
  SearchItemInnerStyle,
  SearchItemStyle,
  SearchListStyle,
} from './styles'

const SearchResults = (props) => {
  const { keyword = '', searchResults = [] } = props
  const getSlugUnderScore = useCallback(getCustomSlug('_'), [])
  const getPokemonDetailUrl = functionGenerator(
    import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
  )

  const loadingList = searchResults.map((result) => {
    return (
      <SearchItemStyle key={result.id}>
        <SearchItemInnerStyle to={getPokemonDetailUrl(getSlug(result.name))}>
          <ImageColStyle>
            <Image
              src={`https://projectpokemon.org/images/normal-sprite/${getSlugUnderScore(result.name)}.gif`}
            />
          </ImageColStyle>
          <InfoColStyle>
            <NameStyle
              dangerouslySetInnerHTML={{
                __html: result.name.replace(keyword, `<span>${keyword}</span>`),
              }}
            />
          </InfoColStyle>
        </SearchItemInnerStyle>
      </SearchItemStyle>
    )
  })

  return <SearchListStyle>{loadingList}</SearchListStyle>
}

export default SearchResults
