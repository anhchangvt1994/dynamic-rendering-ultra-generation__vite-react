import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getSitemapGroup } from './injector'

const header = '<?xml version="1.0" encoding="UTF-8"?>\n'
const urlOpen =
  header + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
const urlClose = '</urlset>\n'
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[char]!
  )
interface Part {
  name: string
  count: number
  bytes: number
  buffer: string
  bufferBytes: number
}

export class SitemapWriter {
  private host: string
  private outputDir: string
  private stage: string
  private lock: string
  private groups = new Map<string, Part[]>()
  private finished = false
  private urls = 0
  private maxUrls: number
  private maxBytes: number

  constructor(options: {
    host: string
    outputDir: string
    maxUrls?: number
    maxBytes?: number
  }) {
    this.host = new URL(options.host).origin
    this.outputDir = path.resolve(options.outputDir)
    this.maxUrls = options.maxUrls ?? 50000
    this.maxBytes = options.maxBytes ?? 52428800
    if (
      !Number.isSafeInteger(this.maxUrls) ||
      this.maxUrls < 1 ||
      this.maxUrls > 50000 ||
      !Number.isSafeInteger(this.maxBytes) ||
      this.maxBytes < 256 ||
      this.maxBytes > 52428800
    )
      throw new Error('Invalid sitemap file limits')
    fs.mkdirSync(this.outputDir, { recursive: true })
    this.lock = path.join(this.outputDir, '.sgen.lock')
    try {
      const owner = Number(fs.readFileSync(this.lock, 'utf8'))
      if (owner) {
        try {
          process.kill(owner, 0)
          throw new Error(`Sitemap generation already running (PID ${owner})`)
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }
      fs.unlinkSync(this.lock)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    fs.writeFileSync(this.lock, String(process.pid), { flag: 'wx' })
    this.stage = path.join(this.outputDir, `.sgen-${randomUUID()}`)
    try {
      fs.mkdirSync(this.stage)
    } catch (error) {
      fs.unlinkSync(this.lock)
      throw error
    }
  }

  private flush(part: Part) {
    if (!part.buffer) return
    fs.appendFileSync(path.join(this.stage, part.name), part.buffer)
    part.buffer = ''
    part.bufferBytes = 0
  }

  add(url: string) {
    if (this.finished) throw new Error('Sitemap writer is finished')
    if (new URL(url).origin !== this.host)
      throw new Error('Sitemap URL origin mismatch')
    const group = getSitemapGroup(url)
    // lastmod is intentionally omitted: crawl time is not a modification date.
    const entry = `  <url><loc>${xml(url)}</loc></url>\n`
    const bytes = Buffer.byteLength(entry)
    if (Buffer.byteLength(urlOpen + urlClose) + bytes > this.maxBytes)
      throw new Error(`Sitemap entry exceeds byte limit: ${url.slice(0, 120)}`)
    const parts = this.groups.get(group) || []
    let part = parts[parts.length - 1]
    if (
      !part ||
      part.count >= this.maxUrls ||
      part.bytes + bytes > this.maxBytes
    ) {
      const name = `${group}-sitemap${parts.length ? '-' + (parts.length + 1) : ''}.xml`
      // Filesystem components have their own length limit; fail explicitly.
      if (Buffer.byteLength(name) > 240)
        throw new Error('Sitemap route group name is too long')
      part = {
        name,
        count: 0,
        bytes: Buffer.byteLength(urlOpen + urlClose),
        buffer: urlOpen,
        bufferBytes: Buffer.byteLength(urlOpen),
      }
      parts.push(part)
      this.groups.set(group, parts)
    }
    part.count++
    part.bytes += bytes
    this.urls++
    part.buffer += entry
    part.bufferBytes += bytes
    if (part.bufferBytes >= 65536) this.flush(part)
  }

  finish() {
    if (this.finished) throw new Error('Sitemap writer is finished')
    try {
      const parts = [...this.groups.values()]
        .flat()
        .sort((a, b) => a.name.localeCompare(b.name))
      if (!parts.length) throw new Error('Cannot publish an empty sitemap')
      if (parts.length > 50000)
        throw new Error('Sitemap index exceeds 50000 files')
      for (const part of parts) {
        part.buffer += urlClose
        this.flush(part)
      }
      const index =
        header +
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        parts
          .map(
            (part) =>
              `  <sitemap><loc>${xml(this.host + '/sitemap.xml?file=' + part.name)}</loc></sitemap>\n`
          )
          .join('') +
        '</sitemapindex>\n'
      if (Buffer.byteLength(index) > 52428800)
        throw new Error('Sitemap index exceeds byte limit')
      fs.writeFileSync(path.join(this.stage, 'sitemap.xml'), index)
      const subDir = path.join(this.outputDir, 'sitemaps')
      fs.mkdirSync(subDir, { recursive: true })
      // Replace complete individual files, publish the index last. Keep all old
      // referenced files until then; roll back replacements if publishing fails.
      const changed: { target: string; backup?: string }[] = []
      try {
        for (const name of [...parts.map((part) => part.name), 'sitemap.xml']) {
          const target =
            name === 'sitemap.xml'
              ? path.join(this.outputDir, name)
              : path.join(subDir, name)
          const backup = fs.existsSync(target)
            ? path.join(this.stage, name + '.backup')
            : undefined
          if (backup) fs.copyFileSync(target, backup)
          fs.renameSync(path.join(this.stage, name), target)
          changed.push({ target, backup })
        }
      } catch (error) {
        for (const { target, backup } of changed.reverse()) {
          if (backup) fs.renameSync(backup, target)
          else fs.unlinkSync(target)
        }
        throw error
      }
      const names = new Set(parts.map((part) => part.name))
      for (const name of fs.readdirSync(subDir)) {
        if (name.endsWith('.xml') && !names.has(name)) {
          try {
            fs.unlinkSync(path.join(subDir, name))
          } catch (error) {
            console.warn(`Cannot remove old sitemap ${name}: ${error.message}`)
          }
        }
      }
      return { urls: this.urls, files: parts.map((part) => part.name) }
    } finally {
      this.abort()
    }
  }

  abort() {
    if (this.finished) return
    this.finished = true
    try {
      fs.rmSync(this.stage, { recursive: true, force: true })
    } finally {
      fs.unlinkSync(this.lock)
    }
  }
}
