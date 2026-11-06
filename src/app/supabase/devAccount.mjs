// NOTE - yarn dev only: abc@gmail.com signs in with no code. The account and
// its mock data come from supabase/dev-seed (the CLI stack, never production)
export const DEV_TEST_EMAIL = 'abc@gmail.com'
const DEV_TEST_PASSWORD = 'dev-test-abc-2026'

/** { email, password } for the dev test account, or null */
export function devTestAccount(email, dev) {
  const address = String(email || '').trim().toLowerCase()
  if (!dev || address !== DEV_TEST_EMAIL) return null
  return { email: DEV_TEST_EMAIL, password: DEV_TEST_PASSWORD }
}
