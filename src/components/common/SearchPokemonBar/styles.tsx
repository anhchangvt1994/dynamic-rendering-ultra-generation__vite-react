import styled from 'styled-components'
export const OverlayStyle = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #102033b8;
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: max(24px, 12dvh) 18px 20px;
  @media (max-width: 680px) {
    padding-top: 85px;
  }
`
export const ContainerStyle = styled.div`
  width: 100%;
  max-width: 560px;
  min-width: 0;
  max-height: calc(88dvh - 44px);
  overflow-y: auto;
  scrollbar-width: none;
  background: #172d45;
  border: 1px solid #496077;
  color: white;
  border-radius: 22px;
  padding: 23px;
  box-shadow: 0 24px 70px #0004;
  &::-webkit-scrollbar {
    display: none;
  }
  .dialog-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
  }
  .dialog-heading span {
    font-size: 8px;
    letter-spacing: 2px;
    color: #9db2c6;
    font-weight: 600;
  }
  .dialog-heading h2 {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.4px;
    margin-top: 5px;
  }
  .dialog-heading > button {
    width: 36px;
    height: 36px;
    flex: none;
    display: grid;
    place-items: center;
    background: #ffffff10;
    border: 1px solid #ffffff20;
    border-radius: 50%;
    color: white;
  }
  .dialog-heading > button:hover {
    background: #ffffff25;
  }
  @media (max-width: 680px) {
    padding: 20px;
    max-height: calc(100dvh - 110px);
    .dialog-heading h2 {
      font-size: 16px;
    }
  }
`
export const SearchBarStyle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #5f768d;
  border-radius: 12px;
  padding: 0 12px;
  height: 49px;
  background: #ffffff0b;
  &:focus-within {
    border-color: var(--yellow);
  }
  .icon {
    font-size: 21px;
    flex: none;
    color: #b6c8d8;
  }
  input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: 0;
    outline: none;
    color: white;
    font-size: 16px;
    width: 100%;
  }
  input::placeholder {
    color: #a9bfd2;
    font-size: 12px;
  }
  input:focus-visible {
    outline: none;
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
  button {
    display: grid;
    place-items: center;
    width: 30px;
    height: 38px;
    flex: none;
    border: 0;
    background: transparent;
    color: white;
  }
`
export const SearchBodyStyle = styled.div`
  .hint {
    margin: 20px 0;
    color: #b6c8d8;
    font-size: 12px;
    text-align: center;
  }
  .search-suggestions {
    margin-top: 20px;
  }
  .search-suggestions p {
    font-size: 10px;
    color: #a9bfd2;
    margin-bottom: 12px;
  }
  .search-suggestions button {
    margin-right: 6px;
    padding: 8px 11px;
    border: 1px solid #ffffff25;
    border-radius: 8px;
    background: #ffffff08;
    color: white;
    font-size: 10px;
  }
  .search-suggestions button:hover {
    background: #ffffff20;
  }
  .search-error {
    text-align: center;
    padding: 20px;
    font-size: 12px;
  }
  .search-error button {
    margin-top: 12px;
    border: 0;
    background: var(--yellow);
    border-radius: 8px;
    padding: 9px 16px;
    color: var(--ink);
  }
`
