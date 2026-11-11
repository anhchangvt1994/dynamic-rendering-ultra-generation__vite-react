import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { MINI_GAME_PATH } from './paths.mjs'

// routeModules.ts needs the app's aliases, which plain node cannot resolve:
// the wiring is checked in the source text.
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('MINI_GAME_PATH is /mini-game', () => {
  assert.equal(MINI_GAME_PATH, '/mini-game')
})

test("routeModuleFor('/mini-game') leads to ROUTE_MODULES.miniGame", () => {
  const modules = source('../../app/router/routeModules.ts')
  assert.match(modules, /miniGame:\s*lazyRoute\(\(\) => import\('pages\/MiniGamePage'\)\)/)
  assert.match(modules, /case 'mini-game':\s*return ROUTE_MODULES\.miniGame/)
})

test('the router, skeleton and server loader know /mini-game', () => {
  assert.match(source('../../app/router/index.tsx'), /path: 'mini-game'[\s\S]*?id: 'MiniGamePage'/)
  assert.match(source('../../components/PageSkeleton/index.tsx'), /case 'MiniGamePage':/)
  assert.match(source('../../../server/src/server.config.ts'), /'mini-game'[\s\S]*?'mini-game-page'/)
})
