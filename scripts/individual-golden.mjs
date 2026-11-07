// Regenerates the shared golden fixture of individual traits:
// src/pages/BagPage/individuals/golden.json and the matching pgTAP lines in
// supabase/tests/database/pokemon_individuals.test.sql (the block after
// "-- golden vectors", up to the next line that isn't a golden check).
//   node scripts/individual-golden.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { VIBES } from '../src/pages/BagPage/individuals/palettes.mjs'
import { individualTraits } from '../src/pages/BagPage/individuals/traits.mjs'

const at = (path) => fileURLToPath(new URL(path, import.meta.url))

// the seven v1 ids first, then k·0x9e3779b1 mod 2³² for k = 1, 2, … up to 16
const V1 = [
  '00000000-0000-4000-8000-00009e3779b1',
  '00000000-0000-4000-8000-00003c6ef362',
  '00000000-0000-4000-8000-0000daa66d13',
  '00000000-0000-4000-8000-000078dde6c4',
  '00000000-0000-4000-8000-00006a99b44c',
  '00000000-0000-4000-8000-000081af14c1',
  '00000000-0000-4000-8000-00003ba366f2',
]
const ids = [...V1]
for (let k = 1n; ids.length < 16; k++) {
  const n = (k * 0x9e3779b1n) % 2n ** 32n
  const id = `00000000-0000-4000-8000-0000${n.toString(16).padStart(8, '0')}`
  if (!ids.includes(id)) ids.push(id)
}

// vibe cycles no vibe, cute, cool, fierce, mystic, nature
const golden = []
for (const [i, id] of ids.entries()) {
  const vibe = [null, ...VIBES][i % 6]
  golden.push({ id, vibe, traits: await individualTraits(id, vibe) })
}

const jsonPath = at('../src/pages/BagPage/individuals/golden.json')
writeFileSync(jsonPath, `${JSON.stringify(golden, null, 2)}\n`)

const sqlPath = at('../supabase/tests/database/pokemon_individuals.test.sql')
const lines = readFileSync(sqlPath, 'utf8').split('\n')
const head = lines.findIndex((l) => l.startsWith('-- golden vectors'))
if (head < 0) throw new Error('no "-- golden vectors" line in the pgTAP file')
let end = head + 1
while (lines[end]?.startsWith('select is(public.pokemon_individual_traits'))
  end++
const checks = golden.map(
  ({ id, vibe, traits }) =>
    `select is(public.pokemon_individual_traits_v('${id}'::uuid,${vibe ? `'${vibe}'` : 'null'}),$$${JSON.stringify(traits)}$$::jsonb,'golden ${id} ${vibe}');`
)
lines.splice(head + 1, end - head - 1, ...checks)
writeFileSync(sqlPath, lines.join('\n'))
console.log(`wrote ${golden.length} golden vectors`)
