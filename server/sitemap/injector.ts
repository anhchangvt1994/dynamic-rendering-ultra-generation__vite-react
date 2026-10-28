import { createHash } from 'node:crypto'

// Keep established group names. Hash reserved/arbitrary/long route segments so
// filenames stay bounded and cannot escape the output directory or alias a
// readable group (including the homepage's reserved "pages" group).
export const getSitemapGroup = (url: string) => {
  const segment = new URL(url).pathname.split('/').filter(Boolean)[0] || ''
  if (!segment) return 'pages'
  if (segment === 'blogs') return 'blog'
  if (
    /^[a-zA-Z0-9_-]{1,160}$/.test(segment) &&
    !['pages', 'blog'].includes(segment) &&
    !segment.startsWith('path-')
  )
    return segment
  return `path-${createHash('sha256').update(segment).digest('hex')}`
}
