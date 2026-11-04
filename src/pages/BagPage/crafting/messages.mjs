// What a craft state says in words (the row's status line and the live region).
const ERRORS = {
  insufficient_shards: 'Không đủ mảnh để ghép hổ phách',
  storage_blocked: 'Trình duyệt không cho lưu, chưa ghép hổ phách',
  pending_unreadable: 'Không đọc được lần ghép đang chờ, chưa ghép hổ phách',
  craft_unavailable: 'Chỉ tài khoản đăng nhập mới ghép được hổ phách',
}

export function craftMessage(name, state) {
  if (!state) return null
  if (state.kind === 'submitting') return `Đang ghép hổ phách ${name}`
  if (state.kind === 'success' && state.receipt)
    return `Đã ghép hổ phách ${name}: còn ${state.receipt.shardCount} mảnh, có ${state.receipt.cardCount} viên hổ phách`
  if (state.kind === 'uncertain')
    return `Chưa biết kết quả ghép hổ phách ${name}, bấm để kiểm tra lại`
  if (state.kind === 'error')
    return `${ERRORS[state.code] ?? 'Không ghép được hổ phách'} ${name}`
  return null
}
