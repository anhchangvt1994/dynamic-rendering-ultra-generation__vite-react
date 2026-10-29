import { Pokeball } from 'components/common/FieldIcon'
import styled from 'styled-components'
const LoadingStyle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 20px;
  color: #aab9c7;
  font-size: 11px;
  svg {
    width: 24px;
    height: 24px;
  }
`
export default function InfinityLoading() {
  return (
    <LoadingStyle role="status">
      <Pokeball />
      Đang tải thêm…
    </LoadingStyle>
  )
}
