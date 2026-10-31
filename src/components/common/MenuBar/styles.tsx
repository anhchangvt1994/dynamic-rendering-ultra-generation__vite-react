import styled from 'styled-components'
export const OverlayStyle = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #102033a8;
  backdrop-filter: blur(5px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition:
    opacity 200ms,
    visibility 0s linear ${({ $isOpen }) => ($isOpen ? '0s' : '200ms')};
`
export const ContainerStyle = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  max-width: 86vw;
  background: var(--ink);
  color: white;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: none;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(-100%)')};
  transition: transform 250ms cubic-bezier(0.2, 0.7, 0.3, 1);
  &::-webkit-scrollbar {
    display: none;
  }
  .menu-footnote {
    font-size: 11px;
    line-height: 1.8 !important;
    color: #a6bcd0;
    margin: 20px 24px 30px;
  }
`
export const HeaderStyle = styled.div`
  padding: 28px 22px;
  border-bottom: 1px solid #ffffff20;
  display: flex;
  align-items: center;
  gap: 10px;
  .menu-ball {
    width: 34px;
    height: 34px;
    flex: none;
    color: white;
  }
  > div {
    flex: 1;
  }
  span {
    color: #a6bcd0;
    font-size: 11px;
    letter-spacing: 2px;
  }
  h2 {
    font-size: 15px;
    font-weight: 700;
    margin-top: 5px;
  }
  button {
    display: grid;
    place-items: center;
    width: 34px;
    height: 38px;
    border: 1px solid #ffffff20;
    border-radius: 10px;
    color: white;
    background: #ffffff10;
    flex: none;
  }
  button:hover {
    background: #ffffff25;
  }
`
export const BodyStyle = styled.div`
  flex: 1;
  padding: 24px 14px;
`
export const MenuItemStyle = styled(LinkCustom)`
  position: relative;
  display: flex;
  align-items: center;
  padding: 15px 18px;
  gap: 13px;
  margin-bottom: 7px;
  color: #c5d5e5;
  border-radius: 11px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  transition: background 150ms;
  .icon {
    flex: none;
    font-size: 22px;
  }
  .label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &:hover {
    background: #ffffff10;
  }
  &.is-active {
    background: #ffffff15;
    border-color: #ffffff20;
    color: var(--yellow);
  }
`
