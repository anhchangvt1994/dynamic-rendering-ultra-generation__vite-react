import path from 'node:path'

// Root-scoped sitemap URLs can describe every path on the site. Keep the
// legacy /sitemaps/*.xml route for existing callers and prerender file layout.
export const resolveSitemapFile = (root: string, url: string, query = '') => {
  if (url === '/sitemap.xml') {
    const files = new URLSearchParams(query).getAll('file')
    if (!files.length) return path.join(root, 'sitemap.xml')
    if (files.length !== 1 || !/^[a-zA-Z0-9_-]+\.xml$/.test(files[0]))
      throw new Error('Invalid sitemap filename')
    return path.join(root, 'sitemaps', files[0])
  }
  const name = url.startsWith('/sitemaps/')
    ? url.slice('/sitemaps/'.length)
    : ''
  if (!/^[a-zA-Z0-9_-]+\.xml$/.test(name))
    throw new Error('Invalid sitemap filename')
  return path.join(root, 'sitemaps', name)
}
