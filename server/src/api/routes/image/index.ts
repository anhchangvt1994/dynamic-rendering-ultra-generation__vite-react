import type { Express } from 'express'
import { serveImage } from './serve'

/** GET /api/image/<key>.webp (express: yarn dev) */
const ImageRouter = {
  init(app: Express) {
    app.get('/api/image/:file', async (req, res) => {
      const out = await serveImage(req.path)
      res.status(out.status).type(out.type)
      res.setHeader('Cache-Control', out.cache)
      if (out.kind) res.setHeader('X-Image-Kind', out.kind)
      res.end(out.body)
    })
  },
}

export default ImageRouter
