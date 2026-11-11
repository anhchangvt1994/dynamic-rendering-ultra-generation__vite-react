import { TemplatedApp } from 'uWebSockets.js'
import { serveImage, serveRig } from './serve'

const STATUS = {
  200: '200 OK',
  404: '404 Not Found',
  503: '503 Service Unavailable',
}

/** GET /api/image/<key>.webp and /api/image/rig/<key>/<file> (uWebSockets) */
const ImageRouter = {
  init(app: TemplatedApp) {
    app.get('/api/image/*', async (res, req) => {
      let aborted = false
      res.onAborted(() => {
        aborted = true
      })
      const url = req.getUrl()
      const out = url.startsWith('/api/image/rig/')
        ? await serveRig(url)
        : await serveImage(url)
      if (aborted) return
      res.cork(() => {
        res.writeStatus(STATUS[out.status] ?? '500 Internal Server Error')
        res.writeHeader('Content-Type', out.type)
        res.writeHeader('Cache-Control', out.cache)
        res.end(out.body)
      })
    })
  },
}

export default ImageRouter
