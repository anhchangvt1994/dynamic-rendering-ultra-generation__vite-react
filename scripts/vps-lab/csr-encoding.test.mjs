import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  brotliCompressSync,
  brotliDecompressSync,
  gzipSync,
  gunzipSync,
} from 'node:zlib'
const source = fs.readFileSync(
  'server/src/puppeteer-ssr/index.uws/index.ts',
  'utf8'
)
const start = source.indexOf('              const body = (() => {')
const end = source.indexOf('              return { status, body }', start)
const encode = new Function(
  'html',
  'enableContentEncoding',
  'contentEncoding',
  'brotliCompressSync',
  'brotliDecompressSync',
  'gzipSync',
  'BROTLI_OPTIONS',
  'Console',
  source.slice(start, end) + '\nreturn body'
)
test('cached CSR Brotli HTML is sent as identity/gzip/br with exactly one matching encoding', () => {
  const html = '<html><title>Ready</title><a href="/blogs">Blogs</a></html>'
  for (const [enable, encoding] of [
    [true, ''],
    [true, 'gzip'],
    [true, 'br'],
    [false, ''],
  ]) {
    const body = encode(
      brotliCompressSync(Buffer.from(html)),
      enable,
      encoding,
      brotliCompressSync,
      brotliDecompressSync,
      gzipSync,
      {},
      { error: () => {} }
    )
    const decoded =
      encoding === 'br'
        ? brotliDecompressSync(body)
        : encoding === 'gzip'
          ? gunzipSync(body)
          : body
    assert.equal(
      decoded.toString(),
      html,
      `encoding=${encoding || 'identity'},enable=${enable}`
    )
  }
})
