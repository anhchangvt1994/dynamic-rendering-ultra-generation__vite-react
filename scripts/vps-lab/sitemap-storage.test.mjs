import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { readSitemapSeeds } = require('../../server/sitemap/seeds.ts')
const { SitemapWriter } = require('../../server/sitemap/writer.ts')
const host = 'https://example.com'

test('missing seed creates its parents and a valid empty XML index automatically', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-missing-root-'))
  try {
    const file = path.join(dir, 'nested/output/sitemap.xml')
    assert.deepEqual(readSitemapSeeds(file, host, 20), [])
    assert.match(fs.readFileSync(file, 'utf8'), /<sitemapindex\b/)
    assert.match(fs.readFileSync(file, 'utf8'), /<\/sitemapindex>/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('stale index repairs missing child directories/files, preserves existing seeds, then publishes real URLs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-missing-child-'))
  try {
    const file = path.join(dir, 'sitemap.xml')
    const index = `<sitemapindex><sitemap><loc>${host}/sitemap.xml?file=pokemon-sitemap.xml</loc></sitemap><sitemap><loc>${host}/sitemap.xml?file=blog-sitemap.xml</loc></sitemap></sitemapindex>`
    fs.writeFileSync(file, index)
    assert.deepEqual(readSitemapSeeds(file, host, 20), [])
    const child = path.join(dir, 'sitemaps/pokemon-sitemap.xml')
    assert.match(fs.readFileSync(child, 'utf8'), /<urlset\b/)
    assert.match(fs.readFileSync(child, 'utf8'), /<\/urlset>/)
    const blog = path.join(dir, 'sitemaps/blog-sitemap.xml')
    const known = `<urlset><url><loc>${host}/blogs/known</loc></url></urlset>`
    fs.writeFileSync(blog, known)
    fs.unlinkSync(child)
    assert.deepEqual(readSitemapSeeds(file, host, 20), [host + '/blogs/known'])
    assert.equal(fs.readFileSync(blog, 'utf8'), known)
    assert.equal(fs.readFileSync(file, 'utf8'), index)
    const writer = new SitemapWriter({ host, outputDir: dir })
    writer.add(host + '/pokemon/pikachu')
    writer.add(host + '/blogs/known')
    writer.finish()
    assert.match(fs.readFileSync(child, 'utf8'), /\/pokemon\/pikachu/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('seed read survives unlink between stat and read using the open file descriptor', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-seed-unlink-'))
  const file = path.join(dir, 'sitemap.xml')
  const stat = fs.statSync,
    fstat = fs.fstatSync,
    open = fs.openSync
  let fd,
    removed = false
  const remove = () => {
    if (!removed) {
      fs.unlinkSync(file)
      removed = true
    }
  }
  try {
    fs.writeFileSync(
      file,
      `<urlset><url><loc>${host}/known</loc></url></urlset>`
    )
    t.mock.method(fs, 'openSync', (p, ...args) => {
      const result = open(p, ...args)
      if (p === file) fd = result
      return result
    })
    t.mock.method(fs, 'statSync', (p, ...args) => {
      const result = stat(p, ...args)
      if (p === file) remove()
      return result
    })
    t.mock.method(fs, 'fstatSync', (n, ...args) => {
      const result = fstat(n, ...args)
      if (n === fd) remove()
      return result
    })
    assert.deepEqual(readSitemapSeeds(file, host, 20), [host + '/known'])
    assert.equal(removed, true)
  } finally {
    t.mock.restoreAll()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('writer creates a completely missing output hierarchy and all group files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-auto-write-'))
  try {
    const output = path.join(dir, 'nested/output')
    const writer = new SitemapWriter({ host, outputDir: output })
    writer.add(host + '/')
    writer.add(host + '/pokemon/pikachu')
    writer.finish()
    assert.match(
      fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8'),
      /<sitemapindex\b/
    )
    assert.match(
      fs.readFileSync(
        path.join(output, 'sitemaps/pokemon-sitemap.xml'),
        'utf8'
      ),
      /\/pokemon\/pikachu/
    )
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('a concurrent file creator is preserved and permission errors are not hidden', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sitemap-create-race-'))
  const file = path.join(dir, 'sitemap.xml')
  const write = fs.writeFileSync
  try {
    t.mock.method(fs, 'writeFileSync', (p, ...args) => {
      if (p !== file) return write(p, ...args)
      write(file, `<urlset><url><loc>${host}/concurrent</loc></url></urlset>`)
      throw Object.assign(new Error('already created'), { code: 'EEXIST' })
    })
    assert.deepEqual(readSitemapSeeds(file, host, 20), [host + '/concurrent'])
    t.mock.restoreAll()
    fs.unlinkSync(file)
    const denied = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    })
    t.mock.method(fs, 'mkdirSync', () => {
      throw denied
    })
    assert.throws(
      () => readSitemapSeeds(file, host, 20),
      (error) => error === denied
    )
  } finally {
    t.mock.restoreAll()
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
