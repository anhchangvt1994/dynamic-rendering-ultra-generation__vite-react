import { parse, type DefaultTreeAdapterMap } from 'parse5'
import { getCrawlUrl, normalizeCrawlUrl } from './config'
import type { CrawlPageOptions, CrawlResult } from './crawl-page'

type Node = DefaultTreeAdapterMap['node']
export interface HttpCrawlResult extends CrawlResult {
  needsRender: boolean
}

// Use the HTML5 tree-building rules (including template/noscript/raw text),
// rather than matching hrefs in scripts, examples, or malformed attributes.
export const extractHtmlLinks = (
  html: string,
  url: string,
  options: CrawlPageOptions
): HttpCrawlResult => {
  const { host, crawlOrigin = host } = options
  const hrefs: string[] = [],
    robots: string[] = []
  let baseHref: string | undefined
  let needsRender = !/<[a-z!]/i.test(html) || html.includes('\u0000')
  const stack: Node[] = [parse(html, { scriptingEnabled: true })]
  while (stack.length) {
    const node = stack.pop()!
    if ('tagName' in node) {
      const attrs = Object.fromEntries(
        node.attrs.map((attr) => [attr.name, attr.value])
      )
      const tag = node.tagName
      if (tag === 'base' && baseHref === undefined && 'href' in attrs)
        baseHref = attrs.href
      if ((tag === 'a' || tag === 'area') && attrs.href) hrefs.push(attrs.href)
      if (tag === 'meta' && /^(robots|googlebot)$/i.test(attrs.name || ''))
        robots.push(attrs.content || '')
      if (tag === 'meta' && /^refresh$/i.test(attrs['http-equiv'] || ''))
        needsRender = true
      if (
        ['iframe', 'frame', 'object', 'embed'].includes(tag) ||
        node.attrs.some((attr) => /^on/i.test(attr.name))
      )
        needsRender = true
      if (
        tag === 'script' &&
        !/^(application\/(?:ld\+json|json|xml|rdf\+xml)|text\/(?:plain|template))$/i.test(
          (attrs.type || '').trim()
        )
      )
        needsRender = true
      if (tag === 'template' || tag === 'noscript') continue
    }
    if ('childNodes' in node)
      for (let i = node.childNodes.length - 1; i >= 0; i--)
        stack.push(node.childNodes[i])
  }
  let base = url
  if (baseHref !== undefined) {
    try {
      base = new URL(baseHref, url).href
    } catch {}
  }
  const rules = robots.join(',')
  const noindex = /\b(?:noindex|none)\b/i.test(rules)
  const nofollow = /\b(?:nofollow|none)\b/i.test(rules)
  const data = nofollow
    ? []
    : [
        ...new Set(
          hrefs
            .map((href) => normalizeCrawlUrl(href, base, host, crawlOrigin))
            .filter((href): href is string => !!href)
        ),
      ]
  return {
    status: 200,
    url: normalizeCrawlUrl(url, url, host, crawlOrigin),
    data,
    noindex,
    needsRender,
  }
}

export const crawlHttp = async (
  url: string,
  options: CrawlPageOptions & {
    maxResponseBytes?: number
    signal?: AbortSignal
  }
): Promise<HttpCrawlResult> => {
  const {
    host,
    crawlOrigin = host,
    timeoutMs = 30000,
    maxResponseBytes = 8 * 1048576,
    signal,
  } = options
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const timer = setTimeout(
    () => controller.abort(new Error(`HTTP crawl timed out: ${url}`)),
    timeoutMs
  )
  const seen = new Set<string>()
  let current = url
  let target = getCrawlUrl(current, crawlOrigin)
  try {
    for (let hop = 0; hop < 10; hop++) {
      if (seen.has(target)) throw new Error(`Redirect loop: ${current}`)
      seen.add(target)
      const response = await fetch(target, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent':
            'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          service: 'sitemap-crawler',
          accept: 'text/html,application/xhtml+xml',
          'accept-encoding': 'br, gzip',
        },
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        const next =
          location && normalizeCrawlUrl(location, target, host, crawlOrigin)
        if (!next)
          return { status: 400, url: current, data: [], needsRender: false }
        // Keep the actual redirect path for transport/base URI. Output URL
        // normalization can remove a slash; the HTTP request must not.
        target = getCrawlUrl(new URL(location!, target).href, crawlOrigin)
        current = next
        continue
      }
      const empty = {
        status: response.status,
        url: current,
        data: [],
        needsRender: false,
      }
      if (response.status < 200 || response.status >= 300) {
        await response.body?.cancel()
        return empty
      }
      if (
        !/^(text\/html|application\/xhtml\+xml)\b/i.test(
          response.headers.get('content-type') || ''
        )
      ) {
        await response.body?.cancel()
        return { ...empty, status: 415 }
      }
      if (Number(response.headers.get('content-length')) > maxResponseBytes) {
        await response.body?.cancel()
        throw new Error(`HTTP body limit exceeded: ${current}`)
      }
      const reader = response.body?.getReader()
      const chunks: Uint8Array[] = []
      let bytes = 0
      if (reader)
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            bytes += value.byteLength
            if (bytes > maxResponseBytes) {
              await reader.cancel()
              throw new Error(`HTTP body limit exceeded: ${current}`)
            }
            chunks.push(value)
          }
        } finally {
          reader.releaseLock()
        }
      const result = extractHtmlLinks(
        Buffer.concat(chunks, bytes).toString('utf8'),
        target,
        options
      )
      const robots = response.headers.get('x-robots-tag') || ''
      if (/\b(?:noindex|none)\b/i.test(robots)) result.noindex = true
      if (/\b(?:nofollow|none)\b/i.test(robots)) result.data = []
      return { ...result, url: current }
    }
    throw new Error(`Too many redirects: ${url}`)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
