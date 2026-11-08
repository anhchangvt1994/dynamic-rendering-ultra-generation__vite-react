import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
require('sucrase/register')
const { stagedFile, writeAtomic, removeFile } = require('./staged.ts')

test('temporary GIF is atomically stored and removed after WebP is ready', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'animated-stage-'))
  try {
    const webp = path.join(dir, '15-3-800-25.webp')
    const gif = stagedFile(webp)
    assert.equal(gif, path.join(dir, '15-3-800-25.gif'))
    await writeAtomic(gif, Buffer.from('gif'))
    assert.equal(fs.readFileSync(gif, 'utf8'), 'gif')
    await writeAtomic(webp, Buffer.from('webp'))
    await removeFile(gif)
    assert.equal(fs.readFileSync(webp, 'utf8'), 'webp')
    assert.equal(fs.existsSync(gif), false)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('staged GIF remains available when WebP conversion fails', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'animated-stage-'))
  try {
    const gif = stagedFile(path.join(dir, '15-3-800-25.webp'))
    await writeAtomic(gif, Buffer.from('gif'))
    assert.equal(fs.readFileSync(gif, 'utf8'), 'gif')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
