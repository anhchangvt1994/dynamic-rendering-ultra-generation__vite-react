import type { FastifyInstance } from 'fastify'
import { VIBE_CACHE, VIBE_ROUTE, readVibePath, vibeFor } from './service'
import { vibeDeps } from './source'

/** GET /api/species-vibe/<id> (fastify). */
const apiVibe = {
  init(app: FastifyInstance) {
    app.get(VIBE_ROUTE, async (req, reply) => {
      const r = await vibeFor(readVibePath(req.url) ?? '', vibeDeps)
      if (r.status === 200) reply.header('Cache-Control', VIBE_CACHE)
      return reply.code(r.status).send(r.body)
    })
  },
}

export default apiVibe
