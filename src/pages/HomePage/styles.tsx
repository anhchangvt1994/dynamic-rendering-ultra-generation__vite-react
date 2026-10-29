export const HomePageStyle = styled.div`
  position: relative;
`

// Two entries on a phone, as many ~160px entries as fit on wider screens.
export const PokemonListStyle = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(150px, 40%), 1fr));
  gap: 16px;
  padding: 16px 0;
`

export const BottomLineStyle = styled.div``
