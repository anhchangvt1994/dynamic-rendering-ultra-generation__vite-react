import FormImage from 'components/common/FormImage'
import { functionGenerator } from 'utils/EnvHelper'
import { pokemonLabel } from 'components/pokemon-page/format.mjs'
import { matchRange } from '../../search.mjs'
import {
  DexStyle,
  ImageColStyle,
  InfoColStyle,
  NameStyle,
  SearchItemInnerStyle,
  SearchItemStyle,
  SearchListStyle,
} from './styles'

const toPath = functionGenerator(
  import.meta.env.ROUTER_POKEMON_GET_PATH_FUNCTION
)

// Marks the typed part of the name; rendered as text, never as HTML.
const highlight = (name: string, keyword: string) => {
  const range = matchRange(name, keyword)
  if (!range) return name
  const [from, to] = range
  return (
    <>
      {name.slice(0, from)}
      <mark>{name.slice(from, to)}</mark>
      {name.slice(to)}
    </>
  )
}

// baseId: the species of a form, whose images back up its own
type Result = { name: string; id: number; baseId?: number }

export const optionId = (name: string) => `search-option-${name}`

const SearchResults = ({
  keyword,
  results,
  activeIndex,
  listId,
  onHover,
}: {
  keyword: string
  results: Result[]
  activeIndex: number
  listId: string
  onHover: (index: number) => void
}) => (
  // focus stays in the combobox input; arrows drive the selection
  <SearchListStyle
    id={listId}
    role="listbox"
    aria-label="Kết quả tìm Pokémon"
    tabIndex={-1}
  >
    {results.map((result, index) => (
      <SearchItemStyle
        key={result.name}
        id={optionId(result.name)}
        role="option"
        aria-selected={index === activeIndex}
        onMouseEnter={() => onHover(index)}
      >
        <SearchItemInnerStyle to={toPath(getSlug(result.name))} tabIndex={-1}>
          <ImageColStyle>
            <FormImage
              pokemonId={result.id}
              baseId={result.baseId}
              small
              alt=""
              width={56}
              height={56}
              loading="lazy"
              decoding="async"
            />
          </ImageColStyle>
          <InfoColStyle>
            <NameStyle>
              {highlight(pokemonLabel(result.name), keyword)}
            </NameStyle>
            {result.id <= 1025 && (
              <DexStyle>#{String(result.id).padStart(4, '0')}</DexStyle>
            )}
          </InfoColStyle>
        </SearchItemInnerStyle>
      </SearchItemStyle>
    ))}
  </SearchListStyle>
)

export default SearchResults
