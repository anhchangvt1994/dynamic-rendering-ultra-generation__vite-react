export const SearchListStyle = styled.ul`
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Edge */
  }
  margin-top: 16px;
  max-height: 40dvh;
`

export const SearchItemStyle = styled.li`
  margin-top: 16px;

  &:first-child {
    margin-top: 0;
  }
`

export const SearchItemInnerStyle = styled(LinkCustom)`
  display: flex;
  gap: 8px;
  padding: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 10px;
`

export const SearchItemInnerLoadingStyle = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 10px;
`

export const ImageColStyle = styled.div`
  display: inline-flex;
  flex: 0 0 60px;
  width: 60px;
  height: 60px;
  min-width: 0;
  align-items: center;
  justify-content: center;

  .image-wrapper {
    width: 70%;
    height: 70%;

    &::before,
    &::after {
      display: block;
      content: none;
      position: absolute;
      top: 0;
      left: 50%;
      width: 100%;
      height: 100%;
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
`

export const ImageLoadingStyle = styled.div`
  width: 100%;
  height: 100%;
  min-width: 0;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 8px;
`

export const InfoColStyle = styled.div`
  display: inline-flex;
  flex: 1 1 auto;
  align-items: center;
`

export const NameStyle = styled.div`
  color: #ffffff;
  text-transform: capitalize;
  font-size: 20px;

  span {
    ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
    border-radius: 2px;
  }
`

export const NameLoadingStyle = styled.div`
  width: 100%;
  height: 20px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 4px;
`
