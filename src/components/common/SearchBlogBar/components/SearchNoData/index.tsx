import { SearchNoDataStyle } from 'components/common/SearchPokemonBar/components/SearchNoData/styles'

// Field Notes voice, the Pokédex search's empty state.
const SearchNoData = ({ keyword }: { keyword: string }) => (
  <SearchNoDataStyle role="status">
    Sổ tay chưa có bài nào có tiêu đề chứa <strong>“{keyword}”</strong>.
    <br />
    Thử gõ ngắn hơn, ví dụ “pika”.
  </SearchNoDataStyle>
)

export default SearchNoData
