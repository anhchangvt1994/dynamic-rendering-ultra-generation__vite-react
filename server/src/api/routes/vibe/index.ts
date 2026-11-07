import type { Express } from 'express'
import { VIBE_CACHE, VIBE_ROUTE, vibeFor } from './service'
import { vibeDeps } from './source'

/** GET /api/species-vibe/<id> (express: yarn dev). */
const apiVibe = {
  init(app: Express) {
    app.get(VIBE_ROUTE, async (req, res) => {
      const r = await vibeFor(String(req.params.id), vibeDeps)
      if (r.status === 200) res.setHeader('Cache-Control', VIBE_CACHE)
      res.status(r.status).json(r.body)
    })
  },
}

export default apiVibe
