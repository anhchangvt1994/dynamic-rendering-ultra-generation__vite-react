import fs from 'fs'
import path from 'path'

// NOTE - three is imported from its per-module sources (alias in
// vite.config.mts), so unused modules are tree-shaken. What stays is still
// ~330 kB, over the 150 kB budget, so its modules are cut into chunks along a
// dependency order (a module comes after everything it imports): chunks then
// only import earlier chunks, never each other in a cycle.
const BUDGET = 110 * 1024 // weighted source bytes per chunk
const MINIFIED = 0.45 // JS shrinks to about this; GLSL strings do not
const IMPORT =
  /(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]|import\s*['"](\.[^'"]+)['"]/g

let chunkOf: Map<string, number> | undefined

const build = () => {
  const root = path.resolve('node_modules/three/src')
  const entry = path.join(root, 'Three.js')
  const result = new Map<string, number>()
  if (!fs.existsSync(entry)) return result

  const visited = new Set<string>()
  const order: { file: string; weight: number }[] = []
  const visit = (file: string) => {
    if (visited.has(file)) return
    visited.add(file)
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(IMPORT)) {
      const dep = path.resolve(path.dirname(file), match[1] || match[2])
      if (fs.existsSync(dep) && fs.statSync(dep).isFile()) visit(dep)
    }
    order.push({
      file,
      weight: source.length * (file.includes('/shaders/') ? 1 : MINIFIED),
    })
  }
  visit(entry)

  let chunk = 0
  let size = 0
  for (const { file, weight } of order) {
    if (size + weight > BUDGET && size) {
      chunk++
      size = 0
    }
    size += weight
    result.set(file, chunk)
  }
  return result
}

const splitChunkThree = (pathName: string): boolean | string => {
  if (!pathName || !pathName.includes('node_modules/three/src/')) return false
  chunkOf ??= build()
  const chunk = chunkOf.get(path.resolve(pathName))
  return chunk === undefined ? 'three' : `three-${chunk}`
} // splitChunkThree

export default splitChunkThree
