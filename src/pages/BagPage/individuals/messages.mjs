// What a trade state, or a failed rename, says in words.
const TRADE_ERRORS = {
  insufficient_cards: 'Không đủ hổ phách để đổi',
  storage_blocked: 'Trình duyệt không cho lưu, chưa đổi hổ phách',
  pending_unreadable: 'Không đọc được lần đổi đang chờ, chưa đổi hổ phách',
  trade_unavailable: 'Chỉ tài khoản đăng nhập mới đổi được hổ phách',
  operation_conflict: 'Lần đổi này bị trùng, hãy thử lại',
  journal_corrupt: 'Dữ liệu trong trình duyệt bị hỏng, chưa đổi hổ phách',
}

export function tradeMessage(name, state) {
  if (!state) return null
  if (state.kind === 'submitting') return `Đang đổi hổ phách ${name}`
  if (state.kind === 'success' && state.receipt)
    return `Đã đổi hổ phách ${name} thành cá thể mới, còn ${state.receipt.cardCount} viên hổ phách`
  if (state.kind === 'uncertain')
    return `Chưa biết kết quả đổi hổ phách ${name}, bấm để kiểm tra lại`
  if (state.kind === 'error')
    return `${TRADE_ERRORS[state.code] ?? 'Không đổi được hổ phách'} (${name})`
  return null
}

export function nameError(code) {
  if (code === 'invalid_nickname')
    return "Tên chỉ gồm chữ, số, khoảng trắng và - ' . (tối đa 16 ký tự)"
  if (code === 'not_found') return 'Không tìm thấy cá thể này'
  return 'Chưa lưu được tên, hãy thử lại'
}
