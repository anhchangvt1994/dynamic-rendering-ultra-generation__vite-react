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

// Marks the first match of the typed keyword; rendered as React text, not
// injected HTML.
const highlight = (name: string, keyword: string) => {
  const at = keyword ? name.indexOf(keyword) : -1
  if (at < 0) return name
  return (
    <>
      {name.slice(0, at)}
      <mark>{name.slice(at, at + keyword.length)}</mark>
      {name.slice(at + keyword.length)}
    </>
  )
}

const SearchResults = (props) => {
  const { keyword = '', searchResults = [], onScroll } = props
  const getSlugUnderScore = useMemo(() => getCustomSlug('_'), [])
  const getPokemonDetailUrl = functionGenerator(
    import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
  )

  const loadingList = searchResults.map((result) => {
    return (
      <SearchItemStyle key={result.name}>
        <SearchItemInnerStyle to={getPokemonDetailUrl(getSlug(result.name))}>
          <ImageColStyle>
            <Image
              src={`https://projectpokemon.org/images/normal-sprite/${getSlugUnderScore(result.name)}.gif`}
            />
          </ImageColStyle>
          <InfoColStyle>
            <NameStyle>{highlight(result.name, keyword)}</NameStyle>
          </InfoColStyle>
        </SearchItemInnerStyle>
      </SearchItemStyle>
    )
  })

  return <SearchListStyle onScroll={onScroll}>{loadingList}</SearchListStyle>
}

export default SearchResults
