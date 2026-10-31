/** Supabase Auth errors, in the words of the page (Vietnamese) */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu chưa đúng.',
  email_not_confirmed: 'Email này chưa được xác nhận.',
  user_already_exists: 'Email này đã có tài khoản. Hãy đăng nhập.',
  email_exists: 'Email này đã có tài khoản. Hãy đăng nhập.',
  weak_password: 'Mật khẩu cần ít nhất 8 ký tự, có cả chữ và số.',
  same_password: 'Mật khẩu mới cần khác mật khẩu cũ.',
  otp_expired: 'Mã chưa đúng hoặc đã hết hạn.',
  over_email_send_rate_limit: 'Vừa gửi email rồi, đợi một chút rồi thử lại.',
  over_request_rate_limit: 'Thử hơi nhiều lần rồi, nghỉ vài phút nhé.',
  email_address_invalid: 'Email này có vẻ chưa đúng.',
  validation_failed: 'Email hoặc mật khẩu chưa hợp lệ.',
  signup_disabled: 'Tạm thời chưa mở đăng ký.',
  otp_disabled: 'Chưa có tài khoản với email này. Hãy tạo tài khoản trước.',
  user_not_found: 'Chưa có tài khoản với email này.',
  reauthentication_needed: 'Hãy đăng nhập lại rồi đổi mật khẩu.',
}

export function authMessage(error: unknown) {
  const { code, status, name } = (error ?? {}) as {
    code?: string
    status?: number
    name?: string
  }
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (name === 'AuthRetryableFetchError' || status === 0)
    return 'Không kết nối được máy chủ tài khoản. Kiểm tra mạng rồi thử lại.'
  if (status === 429) return MESSAGES.over_request_rate_limit
  return 'Có lỗi xảy ra, thử lại sau ít phút nhé.'
}
