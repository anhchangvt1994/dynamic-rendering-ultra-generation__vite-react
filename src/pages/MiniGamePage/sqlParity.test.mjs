import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { MINIGAME } from './minigame.mjs'

const migration = (name) =>
  readFileSync(
    new URL(`../../../supabase/migrations/${name}`, import.meta.url),
    'utf8',
  )

const between = (sql, tag) => {
  const parts = sql.split(tag)
  assert.ok(parts.length >= 3, `${tag} block not found`)
  return parts[1]
}

test('minigame_rules() equals MINIGAME', () => {
  const body = between(migration('20261123000100_minigame_turns_5.sql'), '$rules$')
  assert.deepEqual(JSON.parse(body), MINIGAME)
})

test('trainer_avatars() equals AVATARS', async () => {
  const { AVATARS } = await import('./avatars.mjs')
  const body = between(migration('20261122000400_avatar_unlocks.sql'), '$avatars$')
  assert.deepEqual(JSON.parse(body), AVATARS)
})

test('the candy pgTAP file carries every vector', () => {
  const sql = readFileSync(
    new URL('../../../supabase/tests/database/minigame_candy.test.sql', import.meta.url),
    'utf8',
  )
  const vectors = JSON.parse(
    readFileSync(new URL('./games/candy/vectors.json', import.meta.url), 'utf8'),
  )
  assert.ok(vectors.length >= 5)
  for (const v of vectors) {
    assert.ok(sql.includes(JSON.stringify(v.tape)), `${v.name}: tape`)
    assert.ok(sql.includes(JSON.stringify(v.moves)), `${v.name}: moves`)
    assert.ok(sql.includes(`"score":${v.score}`), `${v.name}: score`)
  }
})

test('minigame_block_rules() equals the Block Lab engine constants', async () => {
  const engine = await import('./games/block-lab/engine.mjs')
  const body = between(migration('20261123000300_minigame_block_guideline.sql'), '$block$')
  const rules = JSON.parse(body)
  assert.equal(rules.W, engine.W)
  assert.equal(rules.H, engine.H)
  assert.equal(rules.MAX_EVENTS, engine.MAX_EVENTS)
  assert.deepEqual(rules.GRAVITY_MS, engine.GRAVITY_MS)
  assert.deepEqual(rules.LINE_SCORE, engine.LINE_SCORE)
  assert.deepEqual(rules.LINE_GOALS, engine.LINE_GOALS)
  assert.deepEqual(rules.KICKS_I, engine.KICKS_I)
  assert.deepEqual(rules.KICKS_JLSTZ, engine.KICKS_JLSTZ)
  for (let type = 0; type < 7; type += 1)
    for (let rot = 0; rot < 4; rot += 1)
      assert.deepEqual(rules.SHAPES[type][rot], engine.shapeCells(type, rot), `shape ${type}/${rot}`)
})

test('the block-lab pgTAP file carries every vector', () => {
  const sql = readFileSync(
    new URL('../../../supabase/tests/database/minigame_arcade_games.test.sql', import.meta.url),
    'utf8',
  )
  const vectors = JSON.parse(
    readFileSync(new URL('./games/block-lab/vectors.json', import.meta.url), 'utf8'),
  )
  assert.ok(vectors.length >= 6)
  for (const v of vectors) {
    assert.ok(sql.includes(JSON.stringify(v.log)), `${v.name}: log`)
    assert.ok(sql.includes(JSON.stringify(v.expect.cells)), `${v.name}: cells`)
    assert.ok(sql.includes(`'${v.expect.score}','${v.name}: score'`), `${v.name}: score`)
  }
})

test('minigame_jigsaw_rules() equals the jigsaw engine', async () => {
  const engine = await import('./games/silhouette-atelier/engine.mjs')
  const body = between(migration('20261123000400_minigame_jigsaw.sql'), '$jigsaw$')
  const rules = JSON.parse(body)
  assert.deepEqual(rules.GRIDS, engine.GRIDS)
  assert.equal(rules.MAX_EVENTS, engine.MAX_EVENTS)
  assert.equal(rules.TURN, engine.TURN)
  assert.equal(rules.TRAY, engine.TRAY)
})

test('the jigsaw pgTAP file carries every replay vector', () => {
  const sql = readFileSync(
    new URL('../../../supabase/tests/database/minigame_arcade_games.test.sql', import.meta.url),
    'utf8',
  )
  const vectors = JSON.parse(readFileSync(new URL('./games/silhouette-atelier/vectors.json', import.meta.url), 'utf8'))
  assert.ok(vectors.length >= 6)
  for (const v of vectors) {
    assert.ok(sql.includes(JSON.stringify(v.log)), `${v.name}: move log`)
    assert.ok(sql.includes(JSON.stringify({ rot: v.rot })), `${v.name}: layout`)
    assert.ok(sql.includes(`jigsaw vector ${v.name}`), `${v.name}: vector label`)
  }
})

test('minigame_spin_rules() equals the Lucky Spin rules', async () => {
  const { SPIN } = await import('./games/lucky-spin/rules.mjs')
  const body = between(migration('20261123000500_minigame_lucky_grid.sql'), '$spin$')
  assert.deepEqual(JSON.parse(body), SPIN)
})
