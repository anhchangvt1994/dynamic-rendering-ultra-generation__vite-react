import path from 'node:path'
import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { normalizeCrawlUrl } from './config'
import { resolveSitemapFile } from '../src/sitemap/path'
import { readSitemapXml } from './storage'
type Node = DefaultTreeAdapterMap['node']
const text = (node: Node): string =>
  'value' in node
    ? node.value
    : 'childNodes' in node
      ? node.childNodes.map(text).join('')
      : ''

// Previous URLs are queued and fetched again; they are never copied blindly.
// This avoids shrinking the sitemap when an infinite list renders a different
// batch, while allowing 404/noindex pages to disappear on the next generation.
export const readSitemapSeeds = (
  file: string,
  host: string,
  maxPages: number
): string[] => {
  const root = path.dirname(path.resolve(file))
  const pending = [path.resolve(file)],
    seen = new Set<string>(),
    urls = new Set<string>()
  while (pending.length) {
    const filename = pending.pop()!
    if (seen.has(filename)) continue
    seen.add(filename)
    const doc = parse(
      readSitemapXml(
        filename,
        filename === path.resolve(file) ? 'sitemapindex' : 'urlset'
      )
    )
    const stack = [doc as Node]
    const locs: string[] = []
    let index = false
    while (stack.length) {
      const node = stack.pop()!
      if ('tagName' in node) {
        if (node.tagName === 'sitemapindex') index = true
        if (node.tagName === 'loc') locs.push(text(node))
      }
      if ('childNodes' in node)
        for (let i = node.childNodes.length - 1; i >= 0; i--)
          stack.push(node.childNodes[i])
    }
    for (const loc of locs) {
      let parsed: URL
      try {
        parsed = new URL(loc)
      } catch {
        continue
      }
      if (parsed.origin !== new URL(host).origin) continue
      if (index) {
        pending.push(
          resolveSitemapFile(root, parsed.pathname, parsed.search.slice(1))
        )
        continue
      }
      const url = normalizeCrawlUrl(loc, host, host)
      if (url) urls.add(url)
      if (urls.size > maxPages)
        throw new Error(`Seed sitemap exceeds maxPages (${maxPages})`)
    }
  }
  return [...urls]
}
