import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

// a static `import … from "./chunk.js"` (or a bare `import "./chunk.js"`) at
// the top of a built chunk; dynamic import() is lazy and can not cycle on load
const STATIC_IMPORT =
  /(?:^|[;}\n])\s*import\s*(?:[^'"()]*?from\s*)?["']\.\/([^"']+\.js)["']/g

/**
 * NOTE - Static import cycles between the built chunks of `dir`: a manual
 * chunk split (vite manualChunks) can put two modules that import each other
 * into two chunks that then import each other, and the chunk the browser
 * evaluates first reads the other's bindings before they exist ("Cannot
 * access 'x' before initialization"). The build succeeds; every page fails.
 * Each cycle as "a.js → b.js → a.js".
 */
export function findChunkCycles(dir) {
  if (!existsSync(dir)) return []
  const files = readdirSync(dir).filter((file) => file.endsWith('.js'))
  const graph = new Map(
    files.map((file) => {
      const code = readFileSync(path.join(dir, file), 'utf8')
      const deps = [...code.matchAll(STATIC_IMPORT)].map((match) => match[1])
      return [file, [...new Set(deps)]]
    })
  )
  const cycles = new Set()
  const state = new Map() // 1: on the current path, 2: done
  const visit = (file, trail) => {
    state.set(file, 1)
    trail.push(file)
    for (const dep of graph.get(file) || []) {
      if (state.get(dep) === 1)
        cycles.add([...trail.slice(trail.indexOf(dep)), dep].join(' → '))
      else if (!state.has(dep) && graph.has(dep)) visit(dep, trail)
    }
    trail.pop()
    state.set(file, 2)
  }
  for (const file of files) if (!state.has(file)) visit(file, [])
  return [...cycles]
}
