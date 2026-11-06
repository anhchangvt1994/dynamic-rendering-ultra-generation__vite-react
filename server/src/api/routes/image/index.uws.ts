import { TemplatedApp } from 'uWebSockets.js'
import { serveRig } from './rig/serve'
import { serveImage } from './serve'

const STATUS = { 200: '200 OK', 202: '202 Accepted', 404: '404 Not Found' }

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
        if ('kind' in out && out.kind)
          res.writeHeader('X-Image-Kind', String(out.kind))
        res.end(out.body)
      })
    })
  },
}

export default ImageRouter
