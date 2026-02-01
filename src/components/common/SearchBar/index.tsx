import { ContainerStyle, OverlayStyle, SearchBarStyle } from './styles'

interface SearchBarProps {
  isOpen: boolean
  onClose: () => void
}

const SearchBar = ({ isOpen, onClose }: SearchBarProps) => {
  if (!isOpen) return null

  return (
    <OverlayStyle onClick={onClose}>
      <ContainerStyle onClick={(e) => e.stopPropagation()}>
        <SearchBarStyle>
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Search..." />
        </SearchBarStyle>
      </ContainerStyle>
    </OverlayStyle>
  )
}

export default SearchBar
