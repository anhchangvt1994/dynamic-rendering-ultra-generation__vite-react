export const IMAGE_MIME_TYPE_LIST = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  SVG: 'image/svg+xml',
  BMP: 'image/bmp',
  TIFF: 'image/tiff',
  ICO: 'image/x-icon',
}

export const IMAGE_MIME_TYPE_LIST_WITHOUT_SVG = Object.values(
  IMAGE_MIME_TYPE_LIST
).filter(([, mimeType]) => mimeType !== 'image/svg+xml')
