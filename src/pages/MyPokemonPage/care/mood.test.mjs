import assert from 'node:assert/strict'
import test from 'node:test'
import { initialCare } from './care.mjs'
import { MOODS, mood } from './mood.mjs'
import { moodLine } from './moodLines.mjs'

const T0 = '2026-11-05T00:00:00.000Z'
const at = (minutes) => new Date(Date.parse(T0) + minutes * 60_000)
const care = (over = {}) => ({
  ...initialCare(T0),
  lastCaredAt: T0,
  ...over,
  needs: { hunger: 70, clean: 70, fun: 70, ...over.needs },
})

test('six moods, each with an emoji and a label', () => {
  assert.deepEqual(Object.keys(MOODS).sort(), [
    'angry',
    'glad',
    'happy',
    'hungry',
    'ignoring',
    'sad',
  ])
  assert.deepEqual(MOODS.angry, { emoji: '💢', label: 'Tức giận' })
  assert.deepEqual(MOODS.ignoring, { emoji: '😑', label: 'Làm ngơ' })
  assert.deepEqual(MOODS.hungry, { emoji: '🍖', label: 'Đói' })
  assert.deepEqual(MOODS.sad, { emoji: '😢', label: 'Buồn' })
  assert.deepEqual(MOODS.happy, { emoji: '🥰', label: 'Hạnh phúc' })
  assert.deepEqual(MOODS.glad, { emoji: '😊', label: 'Vui' })
})

test('angry for ten minutes after a disliked dish or one pet too many', () => {
  for (const moodEvent of ['disliked', 'overpet']) {
    const state = care({ moodEvent, moodEventAt: T0 })
    assert.equal(mood(state, T0, at(9)), 'angry')
    assert.notEqual(mood(state, T0, at(10)), 'angry')
  }
})

test('angry wins over hungry and ignoring', () => {
  const state = care({
    needs: { hunger: 30 },
    lastCaredAt: null,
    moodEvent: 'overpet',
    moodEventAt: at(48 * 60),
  })
  assert.equal(mood(state, T0, at(48 * 60 + 1)), 'angry')
})

test('ignoring after 48 hours without care, before hungry', () => {
  const state = care({ needs: { hunger: 30 } })
  assert.equal(mood(state, T0, at(47 * 60)), 'hungry')
  assert.equal(mood(state, T0, at(48 * 60)), 'ignoring')
  const never = care({ lastCaredAt: null })
  assert.equal(mood(never, T0, at(48 * 60)), 'ignoring')
  assert.notEqual(
    mood(never, '2026-11-06T00:00:00.000Z', at(48 * 60)),
    'ignoring'
  )
})

test('hungry below 40, before sad', () => {
  assert.equal(
    mood(care({ needs: { hunger: 39, fun: 25 } }), T0, at(0)),
    'hungry'
  )
  assert.notEqual(mood(care({ needs: { hunger: 40 } }), T0, at(0)), 'hungry')
})

test('sad when fun is at the floor', () => {
  assert.equal(mood(care({ needs: { fun: 25 } }), T0, at(0)), 'sad')
  assert.equal(mood(care({ needs: { fun: 26 } }), T0, at(0)), 'glad')
})

test('happy after a liked dish with every need at 60 or more', () => {
  const liked = { moodEvent: 'liked', moodEventAt: T0 }
  assert.equal(mood(care(liked), T0, at(5)), 'happy')
  assert.equal(
    mood(care({ ...liked, needs: { clean: 50 } }), T0, at(5)),
    'glad'
  )
  assert.equal(mood(care(liked), T0, at(10)), 'glad')
})

test('glad otherwise', () => {
  assert.equal(mood(care(), T0, at(0)), 'glad')
})

test('a short line for every personality and mood', () => {
  for (let personality = 0; personality < 12; personality += 1)
    for (const key of Object.keys(MOODS)) {
      const line = moodLine(personality, key)
      assert.equal(typeof line, 'string')
      assert.ok(line.length > 0, `${personality} ${key}`)
      assert.ok(line.length <= 40, `${personality} ${key}: ${line}`)
    }
})
