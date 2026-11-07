import assert from 'node:assert/strict'
import { test } from 'node:test'
import { seedSql } from './vibe-seed.mjs'

test('seedSql: one upsert of every vibe, then the appearances re-derived', () => {
  const sql = seedSql([
    { id: 4, vibe: 'fierce', v: 1 },
    { id: 1, vibe: 'nature', v: 1 },
  ])
  assert.match(
    sql,
    /insert into public\.pokemon_species_vibes \(species_id, vibe, v\) values\n {2}\(1, 'nature', 1\),\n {2}\(4, 'fierce', 1\)\non conflict \(species_id\) do update set vibe = excluded\.vibe, v = excluded\.v, updated_at = now\(\);/
  )
  assert.ok(sql.trimEnd().endsWith('select public.pokemon_individuals_upgrade_appearance();'))
})

test('seedSql: refuses a row that is not a known vibe or a species id', () => {
  for (const bad of [
    { id: 0, vibe: 'cute', v: 1 },
    { id: 1026, vibe: 'cute', v: 1 },
    { id: 5, vibe: "cute'); drop table x; --", v: 1 },
    { id: 5, vibe: 'cute', v: 1.5 },
  ])
    assert.throws(() => seedSql([bad]), /bad row/)
  assert.throws(() => seedSql([]), /no rows/)
})
