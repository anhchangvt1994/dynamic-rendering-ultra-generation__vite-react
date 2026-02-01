import Image from 'components/common/Image'
import { NameLoadingStyle, PokemonCardLoadingStyle } from './styles'

const PokemonCardLoading = () => {
  return (
    <PokemonCardLoadingStyle>
      <Image
        alt="Loading..."
        src="/images/pikachu-02.webp"
        height={60}
        width={'100%'}
      />
      <NameLoadingStyle>
        <div className="stage">
          <div className="dot-flashing"></div>
        </div>
      </NameLoadingStyle>
    </PokemonCardLoadingStyle>
  )
}

export default PokemonCardLoading
