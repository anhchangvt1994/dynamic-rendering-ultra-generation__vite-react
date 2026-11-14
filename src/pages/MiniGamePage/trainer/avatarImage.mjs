// Own avatar picture: crop a square from any photo and shrink it to a data URL
// small enough for the account (trainer_upload_avatar accepts up to 100000 chars).
export const AVATAR_PX = 256
export const MAX_CHARS = 100000
export const MAX_FILE_BYTES = 12 * 1024 * 1024
const RE = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/

export const fitsAvatar = (url) => typeof url === 'string' && url.length <= MAX_CHARS && RE.test(url)

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/** The square of a w×h picture to keep: zoom ≥ 1, (cx, cy) the focus in 0..1. */
export function squareCrop({ w, h, zoom = 1, cx = 0.5, cy = 0.5 }) {
  const side = Math.min(w, h) / Math.max(1, zoom)
  return {
    sx: clamp(cx * w - side / 2, 0, w - side),
    sy: clamp(cy * h - side / 2, 0, h - side),
    side,
  }
}

/** Draw the crop into a 256px canvas and encode it (webp, else jpeg), under the size limit. */
export function encodeAvatar(source, size, crop) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = AVATAR_PX
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, crop.sx, crop.sy, crop.side, crop.side, 0, 0, AVATAR_PX, AVATAR_PX)
  for (const type of ['image/webp', 'image/jpeg'])
    for (const q of [0.88, 0.78, 0.66, 0.5]) {
      const url = canvas.toDataURL(type, q)
      if (url.startsWith(`data:${type}`) && fitsAvatar(url)) return url
    }
  throw new Error('Ảnh quá nặng, hãy thử ảnh khác.')
}
