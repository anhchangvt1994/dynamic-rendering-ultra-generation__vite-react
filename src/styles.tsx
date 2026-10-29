export const MainContainerStyle = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100dvh;
  overflow: hidden;
  background: var(--canvas);
`

export const BodyWrapperStyle = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
`

export const BodyStyle = styled.main`
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  overscroll-behavior-y: contain;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const ContentStyle = styled.div`
  min-height: 100%;
  &:has(.pokemon-page),
  &:has(.blog-page),
  &:has(.blog-detail-page) {
    padding: 20px 16px 84px;
    background: var(--ink);
    color: white;
  }
`
