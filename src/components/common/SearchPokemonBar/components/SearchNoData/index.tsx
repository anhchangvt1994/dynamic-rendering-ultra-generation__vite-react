import { SearchNoDataStyle } from './styles'

// Pokédex-voice empty state: names what was searched and what to try.
const SearchNoData = ({ keyword }: { keyword: string }) => (
  <SearchNoDataStyle role="status">
    Pokédex chưa ghi nhận Pokémon nào tên chứa <strong>“{keyword}”</strong>.
    <br />
    Thử gõ ngắn hơn, ví dụ “pika”.
  </SearchNoDataStyle>
)

export default SearchNoData
