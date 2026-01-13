export const PokemonPageStyle = styled.div``

export const HeaderStyle = styled.div`
  position: sticky;
  height: 24px;
  margin-top: -16px;
  top: 0;
  z-index: 10;
`

export const BackButtonStyle = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  height: 48px;
  width: 48px;
  user-select: none;
  margin-left: -16px;
  z-index: 10;
`

export const BackIconStyle = styled.span`
  border: solid #ffffff;
  border-width: 0 4px 4px 0;
  display: inline-block;
  padding: 4px;
  transform: rotate(135deg);
  -webkit-transform: rotate(135deg);
`

export const BodyStyle = styled.div`
  position: relative;
  padding: 16px 0;
`

export const ImageWrapperStyle = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  height: 150px;
  z-index: 0;

  &::before,
  &::after {
    display: block;
    content: none;
    position: absolute;
    top: 0;
    left: 50%;
    width: 150px;
    height: 150px;
    transform: translateX(-50%);
    z-index: -1;
  }

  &::before {
    content: '';
    background: url('/images/pikachu-02.webp') no-repeat center center;
    background-size: contain;
  }

  &::after {
    background: url('/images/pokemon-02.webp') no-repeat center center;
    background-size: contain;
  }

  &:has(.show) {
    &::before {
      content: none;
    }
  }

  &:has(.error) {
    &::before {
      content: none;
    }
    &::after {
      content: '';
    }
  }
`

export const ImageStyle = styled.img`
  width: 150px;
  height: 150px;
  object-fit: contain;
`

export const NameStyle = styled.div`
  width: 100%;
  text-align: center;
  margin-top: 8px;
  text-transform: capitalize;
  color: #fff;
  font-size: 24px;
`

export const NameLoadingStyle = styled.div`
  width: 100%;
  height: 36px;
  text-align: center;
  margin-top: 8px;
  text-transform: capitalize;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;

  .dot-flashing {
    position: relative;
    width: 10px;
    height: 10px;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    animation: dot-flashing 1s infinite linear alternate;
    animation-delay: 0.5s;
    border-radius: 0;
  }
  .dot-flashing::before,
  .dot-flashing::after {
    content: '';
    display: inline-block;
    position: absolute;
    top: 0;
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    border-radius: 0;
  }
  .dot-flashing::before {
    left: -20px;
    width: 10px;
    height: 10px;
    animation: dot-flashing 1s infinite alternate;
    animation-delay: 0s;
  }
  .dot-flashing::after {
    left: 20px;
    width: 10px;
    height: 10px;
    animation: dot-flashing 1s infinite alternate;
    animation-delay: 1s;
  }

  @keyframes dot-flashing {
    0% {
      background-color: #e6f826;
    }
    50%,
    100% {
      background-color: rgba(240, 255, 128, 0.2);
    }
  }
`
