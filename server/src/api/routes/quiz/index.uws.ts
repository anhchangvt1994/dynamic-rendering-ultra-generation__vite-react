import type { TemplatedApp } from 'uWebSockets.js'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { MEDIA_CACHE, mediaFor, readMediaPath } from './art'
import { QUIZ_MEDIA_ROUTES, quizMediaConfig } from './config'

/** GET /api/quiz-art/<round>, /api/quiz-cry/<round> (uWebSockets.js). */
const apiQuiz = {
  init(app: TemplatedApp) {
    if (!PROCESS_ENV.ENABLE_SUPABASE) return
    const handler = async (res, req) => {
      let aborted = false
      res.onAborted(() => {
        aborted = true
      })
      const path = readMediaPath(req.getUrl())
      if (!path) {
        res.cork(() => res.writeStatus('404 Not Found').end())
        return
      }
      const media = await mediaFor(path.kind, path.round, quizMediaConfig())
      if (aborted) return
      res.cork(() => {
        res
          .writeStatus(String(media.status))
          .writeHeader('Content-Type', media.type)
        if (media.status === 200) res.writeHeader('Cache-Control', MEDIA_CACHE)
        res.end(media.body)
      })
    }
    for (const route of QUIZ_MEDIA_ROUTES) app.get(route, handler)
  },
}

export default apiQuiz
