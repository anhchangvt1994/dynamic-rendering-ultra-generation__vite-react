import fs from 'fs'
import os from 'os'
import path from 'path'
import Console from '../../utils/ConsoleHandler'

// NOTE - Upstream API hosts that just timed out (ex: a down API answers after
// the 10s fetch timeout): while marked, the requests get a 503 at once instead
// of waiting for it again (a browser has 6 connections per host: a few
// requests waiting for a down API block the other API requests, a render
// waits for its pending requests).
// The mark lasts DOWN_HOST_DURATION, doubled on each failure in a row (the
// host is tried again when it ends) up to DOWN_HOST_MAX_DURATION, a success
// removes it.
// Marked with a file (content: failures in a row), shared by every render
// worker and server process
const DOWN_HOST_DURATION = 30000
const DOWN_HOST_MAX_DURATION = 5 * 60 * 1000
// NOTE - The file is checked at most once per CHECK_INTERVAL by a process
const CHECK_INTERVAL = 1000
const downHostsPath = path.join(os.tmpdir(), 'api-down-hosts')
const checks = new Map<string, { checkedAt: number; isDown: boolean }>()

const _getDownHostFile = (host: string) =>
  path.join(downHostsPath, encodeURIComponent(host))

const _getDuration = (failures: number) =>
  Math.min(
    DOWN_HOST_DURATION * 2 ** Math.max(0, failures - 1),
    DOWN_HOST_MAX_DURATION
  )

export const isHostDown = (host: string) => {
  const now = Date.now()
  const check = checks.get(host)

  if (check && now - check.checkedAt < CHECK_INTERVAL) return check.isDown

  let isDown = false
  try {
    const file = _getDownHostFile(host)
    const failures = Number(fs.readFileSync(file, 'utf8')) || 1
    isDown = now - fs.statSync(file).mtimeMs < _getDuration(failures)
  } catch {}

  checks.set(host, { checkedAt: now, isDown })

  return isDown
} // isHostDown

export const setHostDown = (host: string, isDown: boolean) => {
  checks.set(host, { checkedAt: Date.now(), isDown })

  const file = _getDownHostFile(host)

  try {
    if (isDown) {
      let failures = 0
      try {
        failures = Number(fs.readFileSync(file, 'utf8')) || 0
      } catch {}

      fs.mkdirSync(downHostsPath, { recursive: true })
      fs.writeFileSync(file, String(failures + 1))
    } else if (fs.existsSync(file)) fs.rmSync(file, { force: true })
  } catch (err) {
    Console.error(err)
  }
} // setHostDown

export const HOST_DOWN_RESULT = {
  status: 503,
  message: 'Service Unavailable',
  data: {},
  cookies: undefined,
}
