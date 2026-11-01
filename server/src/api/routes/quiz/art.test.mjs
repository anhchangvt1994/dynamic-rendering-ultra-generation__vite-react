import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerFor, isRoundId, mediaFor } from './art.ts'

const ROUND = '0b7e2d6a-3c1f-4e9a-9a52-8f2d6c1e7b40'
const CONFIG = {
  url: 'http://db.test',
  key: 'service',
  sprites: 'http://sprites.test/pokemon',
}

test('a round id is a uuid, nothing else', () => {
  assert.equal(isRoundId(ROUND), true)
  assert.equal(isRoundId('25'), false)
  assert.equal(isRoundId('../etc'), false)
  assert.equal(isRoundId(''), false)
})

test('the answer comes from quiz_art with the service role', async () => {
  const calls = []
  const fetchStub = async (url, init) => {
    calls.push([url, init])
    return new Response('25', { status: 200 })
  }
  assert.equal(await answerFor(ROUND, CONFIG, fetchStub), 25)
  assert.equal(calls[0][0], 'http://db.test/rest/v1/rpc/quiz_art')
  assert.equal(calls[0][1].headers.Authorization, 'Bearer service')
  assert.deepEqual(JSON.parse(calls[0][1].body), { p_round: ROUND })
})

test('no answer: an unknown round, a refusal, a bad id', async () => {
  const nullStub = async () => new Response('null', { status: 200 })
  const deny = async () => new Response('{}', { status: 401 })
  let called = false
  const spy = async () => ((called = true), new Response('1'))
  assert.equal(await answerFor(ROUND, CONFIG, nullStub), null)
  assert.equal(await answerFor(ROUND, CONFIG, deny), null)
  assert.equal(await answerFor('nope', CONFIG, spy), null)
  assert.equal(called, false)
})

test('the media behind a round: its artwork or its cry, never a number in the URL', async () => {
  const fetched = []
  const fetchStub = async (url) => {
    fetched.push(url)
    if (url.includes('/rpc/')) return new Response('25')
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
  }
  const art = await mediaFor('art', ROUND, CONFIG, fetchStub)
  assert.equal(art.status, 200)
  assert.equal(art.type, 'image/png')
  assert.deepEqual([...art.body], [1, 2, 3])
  assert.equal(
    fetched[1],
    'http://sprites.test/pokemon/other/official-artwork/25.png'
  )
  const cry = await mediaFor('cry', ROUND, CONFIG, fetchStub)
  assert.equal(cry.type, 'audio/ogg')
  assert.equal(
    fetched[3],
    'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg'
  )
  const missing = await mediaFor('art', 'nope', CONFIG, fetchStub)
  assert.equal(missing.status, 404)
  const off = await mediaFor('art', ROUND, { ...CONFIG, key: '' }, fetchStub)
  assert.equal(off.status, 503)
})

test('the media path names the kind and the round', async () => {
  const { readMediaPath } = await import('./art.ts')
  assert.deepEqual(readMediaPath(`/api/quiz-art/${ROUND}`), {
    kind: 'art',
    round: ROUND,
  })
  assert.deepEqual(readMediaPath(`/api/quiz-cry/${ROUND}?x=1`), {
    kind: 'cry',
    round: ROUND,
  })
  assert.equal(readMediaPath('/api/quiz-sound/x'), null)
  assert.equal(readMediaPath('/api?url=x'), null)
})

test('an artwork that does not come is told to the database: the one reason for a swap', async () => {
  const calls = []
  const fetchStub = async (url, init) => {
    calls.push([url, init])
    if (url.endsWith('/rpc/quiz_art')) return new Response('25')
    if (url.endsWith('/rpc/quiz_art_failed'))
      return new Response('', { status: 204 })
    return new Response('gone', { status: 404 })
  }
  const art = await mediaFor('art', ROUND, CONFIG, fetchStub)
  assert.equal(art.status, 502)
  const marked = calls.find(([url]) => url.endsWith('/rpc/quiz_art_failed'))
  assert.ok(marked, 'quiz_art_failed called')
  assert.equal(marked[1].headers.Authorization, 'Bearer service')
  assert.deepEqual(JSON.parse(marked[1].body), { p_round: ROUND })
  // a cry that does not come changes nothing
  calls.length = 0
  await mediaFor('cry', ROUND, CONFIG, fetchStub)
  assert.equal(
    calls.some(([url]) => url.endsWith('/rpc/quiz_art_failed')),
    false
  )
})
