import assert from 'node:assert/strict'
import test from 'node:test'
import { roomReturn } from './returnTo.mjs'

test('roomReturn accepts only a room path', () => {
  assert.equal(
    roomReturn({ returnTo: '/pokemon-cua-toi/abc' }),
    '/pokemon-cua-toi/abc'
  )
  assert.equal(roomReturn({ returnTo: 'https://x.com' }), null)
  assert.equal(roomReturn({ returnTo: '/pokemon-cua-toi/a/b' }), null)
  assert.equal(roomReturn({ returnTo: '/pokemon-cua-toi/a?x=1' }), null)
  assert.equal(roomReturn({ returnTo: '//evil.com/pokemon-cua-toi/a' }), null)
  assert.equal(roomReturn(null), null)
  assert.equal(roomReturn({}), null)
  assert.equal(roomReturn('/pokemon-cua-toi/abc'), null)
})
