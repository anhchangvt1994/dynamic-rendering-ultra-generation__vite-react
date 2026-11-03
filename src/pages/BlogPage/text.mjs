// Small text helpers of the blog pages (pure, tested in node).

// the text cut in parts, the ones matching `term` (any case) marked as hits:
// React renders them as <mark>, never as HTML
export const splitHit = (text, term) => {
  if (!text) return []
  const plain = [{ text, hit: false }]
  if (!term) return plain
  const lower = text.toLowerCase()
  const needle = term.toLowerCase()
  // a few letters change length in lower case: then offsets would drift
  if (lower.length !== text.length) return plain
  const parts = []
  let from = 0
  for (
    let at = lower.indexOf(needle);
    at >= 0;
    at = lower.indexOf(needle, from)
  ) {
    if (at > from) parts.push({ text: text.slice(from, at), hit: false })
    parts.push({ text: text.slice(at, at + needle.length), hit: true })
    from = at + needle.length
  }
  if (!parts.length) return plain
  if (from < text.length) parts.push({ text: text.slice(from), hit: false })
  return parts
}

// the tilt of a card: the same slug always leans the same way, ±1.5°
export const hashAngle = (slug) => {
  let h = 2166136261
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (((h >>> 0) % 31) - 15) / 10
}

// a fixed zone: the server and the browser print the same day
export const formatDate = (iso) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      })
}

export const readLabel = (minutes) =>
  `${Math.max(1, Math.round(minutes))} phút đọc`
