import BattleMessage from 'components/common/BattleMessage'

export default function NotFoundPage() {
  return (
    <BattleMessage
      title="Một 404 hoang dã xuất hiện!"
      action={{ label: 'Về Pokédex', to: import.meta.env.ROUTER_HOME_PATH }}
    >
      Trang bạn tìm không có trong Pokédex. Có thể đường dẫn đã đổi hoặc gõ
      nhầm.
    </BattleMessage>
  )
}
