import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatDate, hashAngle, readLabel, splitHit } from './text.mjs'

test('splitHit marks the match, keeps every character', () => {
  const parts = splitHit('Pikachu mạnh', 'chu')
  assert.equal(parts.map((p) => p.text).join(''), 'Pikachu mạnh')
  assert.deepEqual(
    parts.filter((p) => p.hit).map((p) => p.text),
    ['chu']
  )
  assert.equal(parts.length, 3)
})

test('splitHit is case-insensitive and marks every occurrence', () => {
  const parts = splitHit('Aba aBa', 'ab')
  assert.deepEqual(
    parts.filter((p) => p.hit).map((p) => p.text),
    ['Ab', 'aB']
  )
})

test('splitHit never turns text into markup', () => {
  const parts = splitHit('a<b>', '<')
  assert.deepEqual(parts, [
    { text: 'a', hit: false },
    { text: '<', hit: true },
    { text: 'b>', hit: false },
  ])
})

test('splitHit with no term or no match is one plain part', () => {
  assert.deepEqual(splitHit('abc', ''), [{ text: 'abc', hit: false }])
  assert.deepEqual(splitHit('abc', 'z'), [{ text: 'abc', hit: false }])
  assert.deepEqual(splitHit('', 'z'), [])
})

test('hashAngle is stable and within ±1.5 degrees', () => {
  assert.equal(hashAngle('pikachu'), hashAngle('pikachu'))
  for (const slug of ['a', 'eevee-tien-hoa', 'x'.repeat(300), '']) {
    const angle = hashAngle(slug)
    assert.ok(angle >= -1.5 && angle <= 1.5, `${slug} → ${angle}`)
    assert.equal(angle, Math.round(angle * 10) / 10)
  }
})

test('formatDate is vi-VN and empty for junk', () => {
  assert.match(formatDate('2026-11-03T08:00:00Z'), /2026/)
  assert.equal(formatDate('nope'), '')
  assert.equal(formatDate(''), '')
})

test('readLabel', () => {
  assert.equal(readLabel(3), '3 phút đọc')
  assert.equal(readLabel(0), '1 phút đọc')
})
