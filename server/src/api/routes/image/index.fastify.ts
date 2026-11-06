import type { FastifyInstance } from 'fastify'
import { serveImage } from './serve'

/** GET /api/image/<key>.webp (fastify) */
const ImageRouter = {
  init(app: FastifyInstance) {
    app.get('/api/image/:file', async (req, reply) => {
      const out = await serveImage(req.url.split('?')[0])
      reply
        .code(out.status)
        .header('Content-Type', out.type)
        .header('Cache-Control', out.cache)
      if (out.kind) reply.header('X-Image-Kind', out.kind)
      return reply.send(out.body)
    })
  },
}

export default ImageRouter
