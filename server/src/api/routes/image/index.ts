import type { Express } from 'express'
import { serveImage, serveRig } from './serve'

/** GET /api/image/<key>.webp and /api/image/rig/<key>/<file> (express: yarn dev) */
const ImageRouter = {
  init(app: Express) {
    app.get('/api/image/rig/:key/:file', async (req, res) => {
      const out = await serveRig(req.path)
      res.status(out.status).type(out.type)
      res.setHeader('Cache-Control', out.cache)
      res.end(out.body)
    })
    app.get('/api/image/:file', async (req, res) => {
      const out = await serveImage(req.path)
      res.status(out.status).type(out.type)
      res.setHeader('Cache-Control', out.cache)
      res.end(out.body)
    })
  },
}

export default ImageRouter
