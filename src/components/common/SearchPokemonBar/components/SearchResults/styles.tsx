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
  margin-top: 10px;

  &:first-child {
    margin-top: 0;
  }
`

export const SearchItemInnerStyle = styled(LinkCustom)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 14px 6px 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 12px;
  transition: background 120ms ease-out;

  [aria-selected='true'] > & {
    background: rgba(255, 203, 5, 0.22);
    box-shadow: inset 0 0 0 2px #ffcb05;
  }
`

export const SearchItemInnerLoadingStyle = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 10px;
`

export const ImageColStyle = styled.div`
  display: grid;
  place-items: center;
  flex: 0 0 56px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.22),
    transparent 70%
  );

  img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    /* sprites are pixel art: keep them crisp when scaled */
    image-rendering: pixelated;
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
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

export const DexStyle = styled.span`
  flex: none;
  font-family: 'Dela Gothic One', sans-serif;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
`

export const NameStyle = styled.div`
  color: #ffffff;
  text-transform: capitalize;
  font-size: 20px;

  mark {
    background: none;
    color: #ffcb05;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
`

export const NameLoadingStyle = styled.div`
  width: 100%;
  height: 20px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  border-radius: 4px;
`
