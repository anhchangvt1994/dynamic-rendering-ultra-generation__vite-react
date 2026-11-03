// The blog's Markdown subset: ##/### headings, paragraphs, **bold**, *italic*,
// `code`, fenced code, links, lists, > quotes, ![alt](url) and ---.
// It builds a plain tree, never HTML: whatever is not in the subset stays text.

const SAFE_LINK = /^(https?:\/\/|mailto:)\S+$/i
const SAFE_IMAGE = /^https?:\/\/\S+$/i
const BAD_CHARS = /[\u0000-\u001f\u007f\s]/

export const safeUrl = (url, kind) => {
  if (typeof url !== 'string' || !url || BAD_CHARS.test(url)) return null
  if (url.startsWith('/'))
    return url.startsWith('//') || url.includes('\\') ? null : url
  return (kind === 'image' ? SAFE_IMAGE : SAFE_LINK).test(url) ? url : null
}

const MAX_DEPTH = 4

const parseInline = (s, depth = 0) => {
  if (depth > MAX_DEPTH) return s ? [{ t: 'text', v: s }] : []
  const nodes = []
  let buffer = ''
  const flush = () => {
    if (buffer) nodes.push({ t: 'text', v: buffer })
    buffer = ''
  }
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === '`') {
      const j = s.indexOf('`', i + 1)
      if (j > i + 1) {
        flush()
        nodes.push({ t: 'code', v: s.slice(i + 1, j) })
        i = j + 1
        continue
      }
    } else if (c === '[') {
      const mid = s.indexOf('](', i + 1)
      const end = mid > 0 ? s.indexOf(')', mid + 2) : -1
      const href = end > 0 ? safeUrl(s.slice(mid + 2, end), 'link') : null
      if (href && mid > i + 1) {
        flush()
        nodes.push({
          t: 'a',
          href,
          c: parseInline(s.slice(i + 1, mid), depth + 1),
        })
        i = end + 1
        continue
      }
    } else if (c === '*') {
      const double = s[i + 1] === '*'
      const mark = double ? '**' : '*'
      const j = s.indexOf(mark, i + mark.length)
      if (j > i + mark.length) {
        flush()
        nodes.push({
          t: double ? 'b' : 'i',
          c: parseInline(s.slice(i + mark.length, j), depth + 1),
        })
        i = j + mark.length
        continue
      }
      buffer += mark
      i += mark.length
      continue
    }
    buffer += c
    i++
  }
  flush()
  return nodes
}

const FENCE = /^```(.*)$/
const HEADING = /^(##|###) +(.+)$/
const RULE = /^-{3,}\s*$/
const BULLET = /^[-*] +(.*)$/
const NUMBER = /^\d+[.)] +(.*)$/
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/

const startsBlock = (line) =>
  FENCE.test(line) ||
  HEADING.test(line) ||
  RULE.test(line) ||
  BULLET.test(line) ||
  NUMBER.test(line) ||
  line.startsWith('>') ||
  (IMAGE.test(line) && safeUrl(line.match(IMAGE)[2], 'image') !== null)

export const parseMarkdown = (src) => {
  if (typeof src !== 'string') return []
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    let match
    if ((match = line.match(FENCE))) {
      const code = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```'))
        code.push(lines[i++])
      i++
      blocks.push({
        type: 'code',
        lang: match[1].trim(),
        text: code.join('\n'),
      })
    } else if ((match = line.match(HEADING))) {
      blocks.push({
        type: match[1] === '##' ? 'h2' : 'h3',
        inline: parseInline(match[2].trim()),
      })
      i++
    } else if (RULE.test(line)) {
      blocks.push({ type: 'hr' })
      i++
    } else if (line.startsWith('>')) {
      const quote = []
      while (i < lines.length && lines[i].trim().startsWith('>'))
        quote.push(lines[i++].trim().replace(/^>\s?/, ''))
      blocks.push({
        type: 'quote',
        inline: parseInline(quote.join(' ').trim()),
      })
    } else if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line)
      const pattern = ordered ? NUMBER : BULLET
      const items = []
      while (i < lines.length && pattern.test(lines[i].trim()))
        items.push(parseInline(lines[i++].trim().match(pattern)[1].trim()))
      blocks.push({ type: ordered ? 'ol' : 'ul', items })
    } else if (
      (match = line.match(IMAGE)) &&
      safeUrl(match[2], 'image') !== null
    ) {
      blocks.push({ type: 'img', alt: match[1], src: match[2] })
      i++
    } else {
      const text = []
      while (
        i < lines.length &&
        lines[i].trim() &&
        (!text.length || !startsBlock(lines[i].trim()))
      )
        text.push(lines[i++].trim())
      blocks.push({ type: 'p', inline: parseInline(text.join(' ')) })
    }
  }
  return blocks
}

const inlineText = (nodes) =>
  nodes.map((n) => (n.c ? inlineText(n.c) : n.v)).join('')

// the article read as plain text (meta description fallback, search)
export const plainText = (blocks, max = Infinity) => {
  const text = blocks
    .map((b) => {
      if (b.inline) return inlineText(b.inline)
      if (b.items) return b.items.map(inlineText).join(' ')
      if (b.type === 'code') return b.text
      if (b.type === 'img') return b.alt
      return ''
    })
    .filter(Boolean)
    .join(' ')
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}
