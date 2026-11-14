import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { MAP_PATH } from './paths.mjs'

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('MAP_PATH is /ban-do', () => {
  assert.equal(MAP_PATH, '/ban-do')
})
test('the route module, router, skeleton, server loader and menu know /ban-do', () => {
  assert.match(source('../../app/router/routeModules.ts'), /map:\s*lazyRoute\(\(\) => import\('pages\/MapPage'\)\)/)
  assert.match(source('../../app/router/routeModules.ts'), /case 'ban-do':\s*return ROUTE_MODULES\.map/)
  assert.match(source('../../app/router/index.tsx'), /path: 'ban-do'[\s\S]*?id: 'MapPage'/)
  assert.match(source('../../components/PageSkeleton/index.tsx'), /case 'MapPage':/)
  assert.match(source('../../../server/src/server.config.ts'), /'ban-do'[\s\S]*?'ban-do-page'/)
  assert.match(source('../../components/common/MenuBar/index.tsx'), /path: '\/ban-do'/)
})
