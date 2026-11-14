import test from 'node:test'
import assert from 'node:assert/strict'
import { portraitSvg } from './portrait.mjs'
import { PARTS, CLASSES } from './npc.mjs'

const look = (o = {}) => ({ cls: CLASSES[0].id, hair: 0, hairColor: 0, skin: 0, hat: 0, outfit: 0, accent: 0, accessory: 0, ...o })

test('a valid layered svg', () => {
  const svg = portraitSvg(look())
  assert.match(svg, /^<svg[^>]*viewBox=/)
  assert.ok(svg.endsWith('</svg>'))
  assert.ok(!/NaN|undefined/.test(svg))
})
test('every part changes the picture', () => {
  const base = portraitSvg(look())
  for (const key of Object.keys(PARTS)) assert.notEqual(portraitSvg(look({ [key]: 1 })), base, key)
  assert.notEqual(portraitSvg(look({ cls: CLASSES[1].id })), base)
})
test('same look, same svg; extreme indexes stay valid', () => {
  assert.equal(portraitSvg(look({ hat: 3 })), portraitSvg(look({ hat: 3 })))
  const top = Object.fromEntries(Object.entries(PARTS).map(([k, n]) => [k, n - 1]))
  assert.ok(!/NaN|undefined/.test(portraitSvg(look(top))))
})
