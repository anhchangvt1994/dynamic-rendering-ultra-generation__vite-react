import type { Express } from 'express'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { MEDIA_CACHE, mediaFor, readMediaPath } from './art'
import { QUIZ_MEDIA_ROUTES, quizMediaConfig } from './config'

/** GET /api/quiz-art/<round>, /api/quiz-cry/<round> (express: yarn dev). */
const apiQuiz = {
  init(app: Express) {
    if (!PROCESS_ENV.ENABLE_SUPABASE) return
    app.get(QUIZ_MEDIA_ROUTES, async (req, res) => {
      const path = readMediaPath(req.path)
      if (!path) return res.status(404).end()
      const media = await mediaFor(path.kind, path.round, quizMediaConfig())
      res.status(media.status).type(media.type)
      if (media.status === 200) res.setHeader('Cache-Control', MEDIA_CACHE)
      res.end(Buffer.from(media.body))
    })
  },
}

export default apiQuiz
