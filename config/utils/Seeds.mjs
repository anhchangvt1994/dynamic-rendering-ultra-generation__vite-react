import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export const SEED_DIR = fileURLToPath(
  new URL('../../supabase/seed/', import.meta.url)
)

// NOTE - yarn dev's CLI stack only (seedLocal, supabase db reset): the dev
// test account and its mock data. The self-hosted stack never reads it
export const DEV_SEED_DIR = fileURLToPath(
  new URL('../../supabase/dev-seed/', import.meta.url)
)

/** supabase/seed/*.sql, in name order. Every seed is idempotent. */
export const seedFiles = (dir = SEED_DIR) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((name) => name.endsWith('.sql'))
        .sort()
        .map((name) => path.join(dir, name))
    : []

/** The CLI stack: the production seeds, then the dev-only ones. */
export const localSeedFiles = () => [
  ...seedFiles(),
  ...seedFiles(DEV_SEED_DIR),
]

/** run(sql) -> { status }. Stops at the first failing file. Returns the names loaded. */
export const loadSeeds = (files, run) =>
  files.map((file) => {
    const result = run(fs.readFileSync(file, 'utf8'))
    if (result.status !== 0)
      throw new Error(`Loading seed ${path.basename(file)} failed (see above)`)
    return path.basename(file)
  })
