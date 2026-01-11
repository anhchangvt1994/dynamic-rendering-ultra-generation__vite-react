import {
  ImageLoadingStyle,
  ImageWrapperStyle,
  NameLoadingStyle,
  PokemonCardLoadingStyle,
} from './styles'

const PokemonCardLoading = () => {
  return (
    <PokemonCardLoadingStyle>
      <ImageWrapperStyle>
        <ImageLoadingStyle
          className="show"
          alt="Loading..."
          src="/images/pikachu-02.webp"
          height={60}
        />
      </ImageWrapperStyle>
      <NameLoadingStyle>
        <div className="stage">
          <div className="dot-flashing"></div>
        </div>
      </NameLoadingStyle>
    </PokemonCardLoadingStyle>
  )
}

export default PokemonCardLoading
