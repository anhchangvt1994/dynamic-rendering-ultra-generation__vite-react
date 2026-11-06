import fs from 'fs'
import path from 'path'

// NOTE - A JSON file over the 150 KB-per-file budget can not be split by
// manualChunks: it is one module. In the build, imports of `file` resolve to
// a small module that joins `key` back from parts of at most `maxBytes`,
// each part a module (and, with jsonPartChunk, a chunk) of its own.
// Importers see the same default export; development imports the file as is.
const PREFIX = '\0json-part:'

export const jsonPartChunk = (id: string): boolean | string =>
  id.startsWith(PREFIX) && !id.endsWith(':index')
    ? `json-part-${id.slice(PREFIX.length).replace(/[^\w-]/g, '-')}`
    : false

export default ({
  file,
  key,
  maxBytes = 60000,
}: {
  file: string
  key: string
  maxBytes?: number
}): any => {
  const target = path.resolve(file)
  const name = path.basename(file, '.json')
  const parts = () => {
    const data = JSON.parse(fs.readFileSync(target, 'utf8'))
    const list: unknown[][] = [[]]
    let size = 0
    for (const item of data[key]) {
      const bytes = JSON.stringify(item).length + 1
      if (size + bytes > maxBytes && list.at(-1)!.length) {
        list.push([])
        size = 0
      }
      list.at(-1)!.push(item)
      size += bytes
    }
    return { data, list }
  }
  return {
    name: 'split-json-array',
    apply: 'build',
    enforce: 'pre',
    async resolveId(source: string, importer: string, options: object) {
      if (source.startsWith(PREFIX)) return source
      if (!importer || !source.endsWith('.json')) return null
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      })
      return resolved?.id.split('?')[0] === target
        ? `${PREFIX}${name}:index`
        : null
    },
    load(id: string) {
      if (!id.startsWith(`${PREFIX}${name}:`)) return null
      this.addWatchFile(target)
      const { data, list } = parts()
      const part = id.slice(`${PREFIX}${name}:`.length)
      if (part !== 'index')
        return `export default JSON.parse(${JSON.stringify(JSON.stringify(list[Number(part)]))})`
      const imports = list.map(
        (_, i) => `import p${i} from ${JSON.stringify(`${PREFIX}${name}:${i}`)}`
      )
      const rest = { ...data, [key]: undefined }
      return `${imports.join('\n')}
export default { ...${JSON.stringify(rest)}, ${JSON.stringify(key)}: [${list.map((_, i) => `...p${i}`).join(', ')}] }`
    },
  }
}
