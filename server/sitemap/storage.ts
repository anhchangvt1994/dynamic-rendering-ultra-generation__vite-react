import fs from 'node:fs'
import path from 'node:path'

// Seed indexes may outlive their child files after a cache/deploy cleanup.
// Bootstrap only missing files; never truncate an existing published sitemap.
export const readSitemapXml = (
  filename: string,
  type: 'sitemapindex' | 'urlset'
) => {
  let fd: number
  for (let attempt = 0; ; attempt++) {
    try {
      fd = fs.openSync(filename, 'r')
      break
    } catch (error) {
      if (error.code !== 'ENOENT' || attempt === 2) throw error
      fs.mkdirSync(path.dirname(filename), { recursive: true })
      try {
        fs.writeFileSync(
          filename,
          `<?xml version="1.0" encoding="UTF-8"?>\n<${type} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</${type}>\n`,
          { flag: 'wx' }
        )
      } catch (createError) {
        // Another process may have published the file after our failed open.
        if (createError.code !== 'EEXIST') throw createError
      }
    }
  }
  try {
    // Keep the descriptor open across stat/read, even if the path is replaced
    // by a concurrent publisher or removed by a cleanup process.
    if (fs.fstatSync(fd).size > 52428800)
      throw new Error('Seed sitemap exceeds XML byte limit')
    return fs.readFileSync(fd, 'utf8')
  } finally {
    fs.closeSync(fd)
  }
}
