import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  makeRound,
  quizLabel,
  readBest,
  saveBest,
  seeded,
  speciesFromList,
} from './quiz.mjs'

const entry = (name, id) => ({
  name,
  url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
})

test('only National Dex species are quiz material', () => {
  const species = speciesFromList([
    entry('bulbasaur', 1),
    entry('pecharunt', 1025),
    entry('charizard-mega-x', 10034),
    { name: '' },
  ])
  assert.deepEqual(
    species.map((s) => s.id),
    [1, 1025]
  )
})

test('labels drop the default-form suffix', () => {
  assert.equal(quizLabel('deoxys-normal'), 'Deoxys')
  assert.equal(quizLabel('urshifu-single-strike'), 'Urshifu')
  assert.equal(quizLabel('mr-mime'), 'Mr. Mime')
  assert.equal(quizLabel('jangmo-o'), 'Jangmo-o')
  assert.equal(quizLabel('ho-oh'), 'Ho-Oh')
  assert.equal(quizLabel('pikachu'), 'Pikachu')
})

test('a round has 4 distinct options including the answer', () => {
  const species = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    name: `p${i + 1}`,
  }))
  for (let seed = 1; seed < 50; seed++) {
    const round = makeRound(species, seeded(seed))
    assert.equal(round.options.length, 4)
    assert.equal(new Set(round.options.map((o) => o.id)).size, 4)
    assert.ok(round.options.some((o) => o.id === round.answer.id))
  }
})

test('the same seed gives the same round; recent answers are avoided', () => {
  const species = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `p${i + 1}`,
  }))
  assert.deepEqual(makeRound(species, seeded(7)), makeRound(species, seeded(7)))
  const recent = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  assert.equal(makeRound(species, seeded(3), recent).answer.id, 10)
  assert.equal(makeRound(species.slice(0, 3), seeded(1)), null)
})

test('best streak storage never throws', () => {
  let value = null
  const storage = { getItem: () => value, setItem: (_k, v) => (value = v) }
  assert.equal(readBest(storage), 0)
  saveBest(7, storage)
  assert.equal(readBest(storage), 7)
  const broken = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
  }
  assert.equal(readBest(broken), 0)
  saveBest(3, broken)
})

test('generation filter keeps its id range', async () => {
  const { inGeneration } = await import('./quiz.mjs')
  const species = [1, 151, 152, 251, 1025].map((id) => ({ id, name: `p${id}` }))
  assert.deepEqual(
    inGeneration(species, { start: 1, end: 151 }).map((s) => s.id),
    [1, 151]
  )
  assert.equal(inGeneration(species, null).length, 5)
})

test('typed guesses forgive case, accents and punctuation', async () => {
  const { matchesGuess } = await import('./quiz.mjs')
  assert.ok(matchesGuess('mr mime', 'mr-mime'))
  assert.ok(matchesGuess('Mr. Mime', 'mr-mime'))
  assert.ok(matchesGuess('flabébé', 'flabebe'))
  assert.ok(matchesGuess('deoxys', 'deoxys-normal'))
  assert.ok(matchesGuess('nidoran♀', 'nidoran-f'))
  assert.ok(!matchesGuess('mime', 'mr-mime'))
  assert.ok(!matchesGuess('  ', 'pikachu'))
})
