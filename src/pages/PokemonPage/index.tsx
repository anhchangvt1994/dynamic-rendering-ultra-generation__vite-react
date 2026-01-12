import Body from 'components/pokemon-page/body'
import Header from 'components/pokemon-page/header'
import { PokemonPageStyle } from './styles'

const PokemonPage = () => {
  return (
    <PokemonPageStyle>
      <Header />
      <Body />
    </PokemonPageStyle>
  )
}

export default PokemonPage
