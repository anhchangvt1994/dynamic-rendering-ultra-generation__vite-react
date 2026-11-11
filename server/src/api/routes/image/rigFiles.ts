const FILES: Record<string, string> = {
  'rig.json': 'application/json',
  'flow.webp': 'image/webp',
  'flow-lo.webp': 'image/webp',
  'eye.png': 'image/png',
  'amber.webp': 'image/webp',
}

/** The content type of a rig file (rig.json, sheet-0…3.webp, flow*.webp, eye.png, amber.webp); null for any other name. */
export const rigFileType = (file: string): string | null =>
  Object.hasOwn(FILES, file)
    ? FILES[file]
    : /^sheet-[0-3]\.webp$/.test(file)
      ? 'image/webp'
      : null
