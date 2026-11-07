import type { TemplatedApp } from 'uWebSockets.js'
import { VIBE_CACHE, VIBE_ROUTE, readVibePath, vibeFor } from './service'
import { vibeDeps } from './source'

/** GET /api/species-vibe/<id> (uWebSockets.js). */
const apiVibe = {
  init(app: TemplatedApp) {
    app.get(VIBE_ROUTE, async (res, req) => {
      let aborted = false
      res.onAborted(() => {
        aborted = true
      })
      const r = await vibeFor(readVibePath(req.getUrl()) ?? '', vibeDeps)
      if (aborted) return
      res.cork(() => {
        res
          .writeStatus(String(r.status))
          .writeHeader('Content-Type', 'application/json')
        if (r.status === 200) res.writeHeader('Cache-Control', VIBE_CACHE)
        res.end(JSON.stringify(r.body))
      })
    })
  },
}

export default apiVibe
