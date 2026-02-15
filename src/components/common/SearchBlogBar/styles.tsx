import styled from 'styled-components'

export const OverlayStyle = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.85);
`

export const ContainerStyle = styled.div`
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  ${import.meta.env.STYLE_MIXINS_LIQUID_GLASS}
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
`

export const SearchBarStyle = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 16px;

  .material-symbols-outlined {
    font-size: 24px;
    color: #ffffff;
    margin-right: 12px;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ffffff;
    font-size: 16px;

    &::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }
  }
`

export const ResultsListStyle = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0 0 0;
  max-height: 300px;
  overflow-y: auto;

  li {
    padding: 12px 16px;
    color: #ffffff;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }

  .loading,
  .error,
  .no-results {
    padding: 16px;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
  }

  .error {
    color: #ff6b6b;
  }
`

export const SearchBodyStyle = styled.div``
