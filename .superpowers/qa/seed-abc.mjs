// Local-only: abc@gmail.com with every bag item, 14 Pokémon and shards.  node .superpowers/qa/seed-abc.mjs
import { execFileSync } from 'node:child_process'
const ROOT = '/Users/jupiter/Documents/development/vite-react-seo-project'
const status = JSON.parse(execFileSync(`${ROOT}/node_modules/.bin/supabase`, ['status', '-o', 'json'], { cwd: ROOT }).toString().replace(/^[^{]*/, ''))
const API = status.API_URL
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(API)) throw new Error('local only: ' + API)
const admin = { apikey: status.SERVICE_ROLE_KEY, Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' }
const sql = (q) => execFileSync('docker', ['exec', 'supabase_db_pokedex', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tAc', q]).toString().trim()
const email = 'abc@gmail.com', password = 'abc12345'
let id = sql(`select id from auth.users where email='${email}'`)
if (!id) {
  const made = await (await fetch(`${API}/auth/v1/admin/users`, { method: 'POST', headers: admin, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  id = made.id
  if (!id) throw new Error(JSON.stringify(made))
} else await fetch(`${API}/auth/v1/admin/users/${id}`, { method: 'PUT', headers: admin, body: JSON.stringify({ password, email_confirm: true }) })
const species = [1, 4, 7, 25, 133, 129, 63, 74, 92, 147, 158, 246, 175, 280]
sql(`delete from public.pokemon_individuals where user_id='${id}'`)
for (const s of species) {
  const pid = crypto.randomUUID()
  sql(`insert into public.pokemon_individuals(id,user_id,pokemon_id,personality,appearance,potential) values ('${pid}','${id}',${s},3,'{"v":3,"palette":"origin","shift":[[0,0,0],[0,0,0],[0,0,0]],"marks":null}','{"v":1,"offsets":[0,0,0,0,0,0],"stars":2}')`)
  sql(`insert into public.pokemon_care(individual_id,user_id,hunger,clean,fun,needs_at,affection) values ('${pid}','${id}',80,80,80,now(),0) on conflict do nothing`)
}
sql(`insert into public.bag(user_id,item_id,count) select '${id}', id, 99 from public.quiz_items on conflict (user_id,item_id) do update set count=99`)
sql(`insert into public.pokemon_shards(user_id,pokemon_id,count) select '${id}', s, 50 from unnest(array[${species}]::int[]) s on conflict (user_id,pokemon_id) do update set count=50`)
console.log(sql(`select (select count(*) from public.pokemon_individuals where user_id='${id}') ||' pokemon, '|| (select count(*) from public.bag where user_id='${id}') ||' items, '|| (select count(*) from public.pokemon_shards where user_id='${id}') ||' shards'`))
console.log(`OK ${email} / ${password}`)
