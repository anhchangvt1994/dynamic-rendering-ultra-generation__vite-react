const MAX_RETRY_AFTER_MS = 60000

export const parseRetryAfterMs = (value: string | null | undefined) => {
  if (!value) return 0

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0)
    return Math.min(MAX_RETRY_AFTER_MS, Math.round(seconds * 1000))

  const date = Date.parse(value)
  if (!Number.isFinite(date)) return 0
  return Math.min(MAX_RETRY_AFTER_MS, Math.max(0, date - Date.now()))
}
