import type { FastifyInstance } from 'fastify'
import { serveImage, serveRig } from './serve'

/** GET /api/image/<key>.webp and /api/image/rig/<key>/<file> (fastify) */
const ImageRouter = {
  init(app: FastifyInstance) {
    app.get('/api/image/rig/:key/:file', async (req, reply) => {
      const out = await serveRig(req.url.split('?')[0])
      return reply
        .code(out.status)
        .header('Content-Type', out.type)
        .header('Cache-Control', out.cache)
        .send(out.body)
    })
    app.get('/api/image/:file', async (req, reply) => {
      const out = await serveImage(req.url.split('?')[0])
      reply
        .code(out.status)
        .header('Content-Type', out.type)
        .header('Cache-Control', out.cache)
      return reply.send(out.body)
    })
  },
}

export default ImageRouter
