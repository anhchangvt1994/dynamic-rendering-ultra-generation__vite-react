import assert from 'node:assert/strict'
import test from 'node:test'
import { playDisabledReason } from './playSheet.mjs'

test('a hungry Pokémon cannot play', () => {
  assert.equal(playDisabledReason({ hunger: 39 }), 'Đang đói, hãy cho ăn trước')
})
test('from the hunger threshold on it can', () => {
  assert.equal(playDisabledReason({ hunger: 40 }), null)
})
