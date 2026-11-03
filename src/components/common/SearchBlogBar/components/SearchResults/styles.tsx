import { css } from 'styled-components'
import { functionGenerator } from 'utils/EnvHelper'
import {
  InfoColStyle as PokemonInfoColStyle,
  SearchItemInnerLoadingStyle,
  SearchItemInnerStyle as PokemonItemInnerStyle,
  SearchItemStyle,
  SearchListStyle,
} from 'components/common/SearchPokemonBar/components/SearchResults/styles'

const generateReadMoreMultipleLineStyle = functionGenerator(
  import.meta.env.STYLE_MIXINS_READ_MORE_MULTIPLE_LINE_FUNCTION
)

// rows, hover, the selected row and the loading row come from the Pokédex
// search; only the thumbnail (a cover) and the text (title + excerpt) differ
export { SearchItemInnerLoadingStyle, SearchItemStyle, SearchListStyle }
export const SearchItemInnerStyle = PokemonItemInnerStyle

export const ImageColStyle = styled.div`
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--cover, #ffffff22);

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

export const ImageLoadingStyle = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff14;
`

export const InfoColStyle = styled(PokemonInfoColStyle)`
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 2px;
`

export const NameStyle = styled.div`
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  ${generateReadMoreMultipleLineStyle(css, 1)}

  mark {
    background: none;
    color: #ffcb05;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
`

export const NameLoadingStyle = styled.div`
  width: 60%;
  height: 16px;
  background: #ffffff14;
  border-radius: 4px;
`

export const DescriptionStyle = styled.div`
  color: #b6c8d8;
  font-size: 12px;
  line-height: 1.4;
  ${generateReadMoreMultipleLineStyle(css, 1)}
`

export const DescriptionLoadingStyle = styled.div`
  width: 100%;
  height: 12px;
  background: #ffffff14;
  border-radius: 4px;
`
