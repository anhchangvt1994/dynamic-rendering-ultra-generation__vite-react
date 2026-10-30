import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildEncounter,
  pickEncounterIds,
  seedFromDate,
  tint,
  wordLength,
} from './encounter.mjs'

const at = (s) => new Date(2026, 9, 30, 17, 52, s)

test('one moment, one trio; the next second, another', () => {
  assert.deepEqual(pickEncounterIds(at(1)), pickEncounterIds(at(1)))
  assert.notDeepEqual(pickEncounterIds(at(1)), pickEncounterIds(at(2)))
  assert.notEqual(seedFromDate(at(1)), seedFromDate(at(2)))
})

test('three different Pokémon inside the National Dex', () => {
  for (let s = 0; s < 60; s++) {
    const ids = pickEncounterIds(at(s))
    assert.equal(ids.length, 3)
    assert.equal(new Set(ids).size, 3)
    for (const id of ids) assert.ok(id >= 1 && id <= 1025, String(id))
  }
  assert.deepEqual(pickEncounterIds(at(0), 3, 2).sort(), [1, 2])
})

test('cards from the type index; curated ones keep their copy', () => {
  const garchomp = buildEncounter(445, 'garchomp')
  assert.equal(garchomp.name, 'Garchomp')
  assert.equal(garchomp.type, 'Rồng · Đất')
  assert.equal(garchomp.code, 'RỒNG / ĐẤT')
  assert.equal(garchomp.word, 'ROAR!')
  assert.equal(garchomp.art, null)
  assert.equal(garchomp.coin, null)
  assert.match(garchomp.color, /^#[0-9a-f]{6}$/)

  const pikachu = buildEncounter(25, 'pikachu')
  assert.equal(pikachu.note, 'Nhỏ bé. Năng lượng thì không.')
  assert.equal(pikachu.art, '/images/pokemon/hero-25.webp')
  assert.equal(pikachu.coin, '/images/pokemon/25.webp')

  assert.equal(buildEncounter(132).name, '')
})

test('an ellipsis counts as two letters of the sound word', () => {
  assert.equal(wordLength('ZAP!'), 4)
  assert.equal(wordLength('HMM…'), 5)
})

test('tint mixes toward white', () => {
  assert.equal(tint('#000000', 0.5), '#808080')
  assert.equal(tint('#ffffff'), '#ffffff')
})
