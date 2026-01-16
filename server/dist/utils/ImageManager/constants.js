"use strict";Object.defineProperty(exports, "__esModule", {value: true}); const IMAGE_MIME_TYPE_LIST = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  SVG: 'image/svg+xml',
  BMP: 'image/bmp',
  TIFF: 'image/tiff',
  ICO: 'image/x-icon',
}; exports.IMAGE_MIME_TYPE_LIST = IMAGE_MIME_TYPE_LIST

 const IMAGE_MIME_TYPE_LIST_WITHOUT_SVG = Object.values(
  exports.IMAGE_MIME_TYPE_LIST
).filter(([, mimeType]) => mimeType !== 'image/svg+xml'); exports.IMAGE_MIME_TYPE_LIST_WITHOUT_SVG = IMAGE_MIME_TYPE_LIST_WITHOUT_SVG
