const MAX = 16

/*
 * A nickname: NFC, trimmed, spaces collapsed; empty clears; 1-16 characters of
 * letters, digits, space, - ' . only. Same rules as pokemon_name_individual.
 */
export function normalizeNickname(input) {
  const text = String(input ?? '').normalize('NFC')
  // JS \s swallows U+FEFF (a format character): refuse those before spaces
  // collapse; the allowlist below refuses every other hidden or control char
  if (/\p{Cf}/u.test(text)) return { ok: false, code: 'invalid_nickname' }
  const value = text.replace(/\s+/gu, ' ').trim()
  if (value === '') return { ok: true, value: null }
  if ([...value].length > MAX || !/^[\p{L}\p{N}\p{M} '.-]+$/u.test(value))
    return { ok: false, code: 'invalid_nickname' }
  return { ok: true, value }
}
