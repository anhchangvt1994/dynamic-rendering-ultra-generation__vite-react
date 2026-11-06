import { TemplatedApp } from 'uWebSockets.js'
import { serveImage } from './serve'

const STATUS = { 200: '200 OK', 404: '404 Not Found' }

/** GET /api/image/<key>.webp (uWebSockets) */
const ImageRouter = {
  init(app: TemplatedApp) {
    app.get('/api/image/*', async (res, req) => {
      let aborted = false
      res.onAborted(() => {
        aborted = true
      })
      const url = req.getUrl()
      const out = await serveImage(url)
      if (aborted) return
      res.cork(() => {
        res.writeStatus(STATUS[out.status] ?? '500 Internal Server Error')
        res.writeHeader('Content-Type', out.type)
        res.writeHeader('Cache-Control', out.cache)
        if (out.kind) res.writeHeader('X-Image-Kind', out.kind)
        res.end(out.body)
      })
    })
  },
}

export default ImageRouter
