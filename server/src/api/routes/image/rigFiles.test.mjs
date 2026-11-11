import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { rigFileType } = require('./rigFiles.ts')

test('the rig files the server hands out', () => {
  assert.equal(rigFileType('rig.json'), 'application/json')
  assert.equal(rigFileType('sheet-0.webp'), 'image/webp')
  assert.equal(rigFileType('sheet-3.webp'), 'image/webp')
  assert.equal(rigFileType('flow.webp'), 'image/webp')
  assert.equal(rigFileType('flow-lo.webp'), 'image/webp')
  assert.equal(rigFileType('amber.webp'), 'image/webp')
  assert.equal(rigFileType('eye.png'), 'image/png')
})

test('anything else is not a rig file', () => {
  for (const name of ['sheet-4.webp', 'sheet.webp', '../rig.json', '', 'sheet-01.webp'])
    assert.equal(rigFileType(name), null, name)
})
