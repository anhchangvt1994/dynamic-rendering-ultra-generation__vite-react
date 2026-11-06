import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const uws = require('./DetectStaticExtension.uws.ts').default
const express = require('./DetectStaticExtension.ts').default

const uwsReq = (url, headers = {}) => ({
  getUrl: () => url,
  getHeader: (name) => headers[name] ?? '',
})
const expressReq = (url, headers = {}) => ({ url, headers })

// Rollup hashes are base64url: "_" or "-" may end the hash
for (const url of ['/e7544685.DrrtIcm_.js', '/a.b-_.css', '/x_y.png'])
  test(`${url} is static without sec-fetch-dest`, () => {
    assert.equal(uws(uwsReq(url)), true)
    assert.equal(express(expressReq(url)), true)
  })

test('pages stay pages', () => {
  assert.equal(uws(uwsReq('/dang-nhap')), false)
  assert.equal(uws(uwsReq('/x.js', { 'sec-fetch-dest': 'document' })), false)
  assert.equal(express(expressReq('/pokemon/pikachu')), false)
})
