import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { seedFiles, loadSeeds } from './Seeds.mjs'

const dirWith = (names) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seeds-'))
  for (const n of names) fs.writeFileSync(path.join(dir, n), `-- ${n}`)
  return dir
}

test('seedFiles lists only .sql files, in name order', () => {
  const dir = dirWith(['b.sql', 'a.sql', 'notes.md'])
  assert.deepEqual(
    seedFiles(dir).map((f) => path.basename(f)),
    ['a.sql', 'b.sql']
  )
})

test('seedFiles is empty for a missing folder', () => {
  assert.deepEqual(seedFiles('/nonexistent-seed-dir'), [])
})

test('loadSeeds feeds each file to the runner in order', () => {
  const dir = dirWith(['a.sql', 'b.sql'])
  const seen = []
  const loaded = loadSeeds(seedFiles(dir), (sql) => {
    seen.push(sql)
    return { status: 0 }
  })
  assert.deepEqual(seen, ['-- a.sql', '-- b.sql'])
  assert.deepEqual(loaded, ['a.sql', 'b.sql'])
})

test('loadSeeds stops and names the file that failed', () => {
  const dir = dirWith(['a.sql', 'b.sql', 'c.sql'])
  const seen = []
  assert.throws(
    () =>
      loadSeeds(seedFiles(dir), (sql) => {
        seen.push(sql)
        return { status: sql.includes('b.sql') ? 3 : 0 }
      }),
    /b\.sql/
  )
  assert.deepEqual(seen, ['-- a.sql', '-- b.sql'])
})
