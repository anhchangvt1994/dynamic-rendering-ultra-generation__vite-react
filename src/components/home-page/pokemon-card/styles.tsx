export const PokemonCardStyle = styled(LinkCustom)`
  display: inline-flex;
  flex: 0 0 calc(50% - 8px);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  background: -webkit-linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );
  background: linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );

  .image-wrapper {
    width: 100%;
    height: 60px;

    &::before,
    &::after {
      display: block;
      content: none;
      position: absolute;
      top: 0;
      left: 50%;
      width: 120px;
      height: 60px;
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
  }

  .image {
    object-fit: scale-down;
  }
`

export const PokemonCardLoadingStyle = styled.div`
  display: inline-flex;
  flex: 0 0 calc(50% - 8px);
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  background: -webkit-linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );
  background: linear-gradient(
    to right,
    rgb(6, 65, 168, 0.1),
    rgb(0, 255, 187, 0.1)
  );
`

export const NameStyle = styled.div`
  width: 100%;
  text-align: center;
  margin-top: 8px;
  text-transform: capitalize;
  color: #fff;
`

export const NameLoadingStyle = styled.div`
  width: 100%;
  height: 20px;
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
    left: -15px;
    width: 10px;
    height: 10px;
    animation: dot-flashing 1s infinite alternate;
    animation-delay: 0s;
  }
  .dot-flashing::after {
    left: 15px;
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
