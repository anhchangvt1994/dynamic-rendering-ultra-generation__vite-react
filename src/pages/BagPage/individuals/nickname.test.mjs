import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeNickname } from './nickname.mjs'

const ok = (input) => normalizeNickname(input)
const bad = { ok: false, code: 'invalid_nickname' }

test('trims, collapses spaces and keeps good names', () => {
  assert.deepEqual(ok('  Pika   Chu  '), { ok: true, value: 'Pika Chu' })
  assert.deepEqual(ok("Nguyễn Văn-A.'s"), {
    ok: true,
    value: "Nguyễn Văn-A.'s",
  })
  assert.deepEqual(ok('1234567890123456'), {
    ok: true,
    value: '1234567890123456',
  })
})
test('empty or only spaces clears', () => {
  assert.deepEqual(ok(''), { ok: true, value: null })
  assert.deepEqual(ok('   '), { ok: true, value: null })
  assert.deepEqual(ok(null), { ok: true, value: null })
})
test('NFC: composed and decomposed are the same name', () => {
  assert.equal(ok('Ne\u0301').value, 'N\u00e9')
  assert.equal(ok('Nguye\u0302\u0303n').value, 'Nguy\u1ec5n')
})
test('length counts characters, not UTF-16 units', () => {
  assert.deepEqual(ok('12345678901234567'), bad)
  assert.deepEqual(ok('ạ'.repeat(16)), { ok: true, value: 'ạ'.repeat(16) })
})
test('hidden, control and markup characters are refused', () => {
  for (const s of [
    'a​b', // zero-width space
    'a‍b', // zero-width joiner
    'a‮b', // right-to-left override
    'a\u0007b', // control
    'a﻿b', // BOM
    'a<b>',
    'a😀',
    'a­b', // soft hyphen
  ])
    assert.deepEqual(ok(s), bad, JSON.stringify(s))
})
