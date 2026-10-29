import BattleMessage from 'components/common/BattleMessage'
import { useRouteError } from 'react-router'

function RouterError() {
  const error = useRouteError()

  if (!error) return null
  console.error(error)

  return (
    <div className="flex w-full h-dvh items-center">
      <BattleMessage
        title="Trang này vừa gục ngã!"
        action={{ label: 'Tải lại trang', onClick: () => location.reload() }}
      >
        Có lỗi khi hiển thị trang. Tải lại thường sẽ khắc phục được; nếu vẫn
        lỗi, hãy quay lại sau ít phút.
      </BattleMessage>
    </div>
  )
}

export default RouterError
