import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  LIST_COLUMNS,
  articleListPath,
  articlePath,
  articleSearchPath,
  cleanTerm,
  restHeaders,
} from './blogPaths.mjs'

test('list path has the card columns, no body, newest first', () => {
  const path = articleListPath()
  assert.equal(path, `/articles?select=${LIST_COLUMNS}&order=published_at.desc`)
  assert.ok(!LIST_COLUMNS.split(',').includes('body'))
  assert.ok(LIST_COLUMNS.includes('read_minutes'))
})

test('a slug carrying PostgREST syntax stays inside its value', () => {
  const path = articlePath('a&select=*')
  assert.ok(path.includes('a%26select%3D*'))
  assert.equal(path.split('select=').length - 1, 1)
  assert.ok(path.endsWith('&limit=1'))
})

test('cleanTerm drops filter syntax and caps the length', () => {
  assert.equal(cleanTerm('x*,y'), 'x y')
  assert.equal(cleanTerm(' ()*, '), '')
  assert.equal(cleanTerm('a%b&c#d"e\'f\\g'), 'a b c d e f g')
  assert.equal(cleanTerm('  Pika   chu '), 'Pika chu')
  assert.equal(cleanTerm('x'.repeat(200)).length, 60)
})

test('search path escapes the term and is empty for nothing', () => {
  assert.equal(articleSearchPath(' ()*, '), '')
  assert.equal(articleSearchPath(''), '')
  assert.ok(articleSearchPath('Pikachu').includes('ilike.*Pikachu*'))
  assert.ok(articleSearchPath('Điện').includes(encodeURIComponent('Điện')))
  assert.ok(articleSearchPath('a b').includes('a%20b'))
  assert.ok(articleSearchPath('x').endsWith('&limit=8'))
})

test('restHeaders: apikey always, bearer only for a JWT', () => {
  assert.deepEqual(restHeaders('sb_publishable_x'), {
    apikey: 'sb_publishable_x',
  })
  assert.deepEqual(restHeaders('a.b.c'), {
    apikey: 'a.b.c',
    Authorization: 'Bearer a.b.c',
  })
  assert.deepEqual(restHeaders(''), {})
})
