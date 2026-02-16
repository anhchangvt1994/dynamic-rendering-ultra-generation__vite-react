import styled from 'styled-components'

export const OverlayStyle = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition:
    opacity 0.3s ease,
    visibility 0.3s ease;
`

export const ContainerStyle = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  max-width: 85vw;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  transform: ${({ $isOpen }) =>
    $isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.35s ease;
  border-radius: 0;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`

export const HeaderStyle = styled.div`
  padding: 28px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  gap: 12px;

  .menu-icon {
    font-size: 28px;
    color: #ffffff;
  }

  h2 {
    margin: 0;
    color: #ffffff;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }
`

export const BodyStyle = styled.div`
  flex: 1;
  padding: 20px 16px;
`

export const MenuItemStyle = styled(LinkCustom)`
  position: relative;
  display: flex;
  align-items: center;
  padding: 14px 20px;
  margin-bottom: 6px;
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    margin: 0 auto;
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
  }

  &.is-active {
    background: rgba(255, 255, 255, 0.2);

    &:before {
      height: 4px;
    }
  }

  .material-symbols-outlined {
    font-size: 24px;
    color: rgba(255, 255, 255, 0.9);
    margin-right: 14px;
    transition: transform 0.2s ease;
  }

  span:last-child {
    color: #ffffff;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  &:hover .material-symbols-outlined {
    transform: scale(1.1);
  }
`
