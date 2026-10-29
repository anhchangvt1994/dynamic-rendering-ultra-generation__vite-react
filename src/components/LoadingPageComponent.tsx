import { Pokeball } from 'components/common/FieldIcon'
import { memo } from 'react'
import styled from 'styled-components'

const LoadingStyle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  gap: 12px;
  color: var(--muted);
  svg {
    width: 32px;
    height: 32px;
    animation: loading-turn 1.4s ease-in-out infinite;
  }
  p {
    font-size: 11px;
  }
  @keyframes loading-turn {
    25% {
      transform: rotate(-18deg);
    }
    75% {
      transform: rotate(18deg);
    }
  }
`
const LoadingPageComponent = memo(() => (
  <LoadingStyle id="loading-page-component--global" role="status">
    <Pokeball />
    <p>Đang mở hành trình…</p>
  </LoadingStyle>
))
export default LoadingPageComponent
