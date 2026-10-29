import BattleMessage from 'components/common/BattleMessage'
import { useRouteError } from 'react-router'

function RouterError() {
  const error = useRouteError()

  if (!error) return null
  console.error(error)

  // Offline, a lazy page chunk simply cannot download: say so plainly.
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <div className="flex w-full h-dvh items-center">
      {offline ? (
        <BattleMessage
          title="Bạn đang ngoại tuyến!"
          action={{ label: 'Thử lại', onClick: () => location.reload() }}
        >
          Trang này cần mạng để tải. Kết nối lại rồi bấm Thử lại.
        </BattleMessage>
      ) : (
        <BattleMessage
          title="Trang này vừa gục ngã!"
          action={{ label: 'Tải lại trang', onClick: () => location.reload() }}
        >
          Có lỗi khi hiển thị trang. Tải lại thường sẽ khắc phục được; nếu vẫn
          lỗi, hãy quay lại sau ít phút.
        </BattleMessage>
      )}
    </div>
  )
}

export default RouterError
