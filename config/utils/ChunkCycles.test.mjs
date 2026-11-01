import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { findChunkCycles } from './ChunkCycles.mjs'

const fixture = (files) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'chunk-cycles-'))
  for (const [name, code] of Object.entries(files))
    writeFileSync(path.join(dir, name), code)
  return dir
}

test('two chunks importing each other are a cycle', (t) => {
  // the shape of the bag-skeleton / page-skeletons bug, minified
  const dir = fixture({
    'a.1.js': 'import{b as r}from"./b.2.js";const i=`${r}`;export{i as B}',
    'b.2.js':
      'import{u as e}from"./c.3.js";import{B as I}from"./a.1.js";const m=1;export{m as b}',
    'c.3.js': 'const u=1;export{u}',
  })
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  assert.deepEqual(findChunkCycles(dir), ['a.1.js → b.2.js → a.1.js'])
})

test('one-way imports and dynamic imports are no cycle', (t) => {
  const dir = fixture({
    'a.js': 'import{x}from"./shared.js";export const a=()=>import("./b.js")',
    'b.js': 'import{x}from"./shared.js";import"./a.js";export const b=x',
    'shared.js': 'export const x=1',
  })
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  assert.deepEqual(findChunkCycles(dir), [])
})

test('no build output: nothing to check', () => {
  assert.deepEqual(findChunkCycles(path.join(tmpdir(), 'no-such-dist-dir')), [])
})
