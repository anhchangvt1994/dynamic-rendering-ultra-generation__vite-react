import type { FastifyInstance } from 'fastify'
import { PROCESS_ENV } from '../../../utils/InitEnv'
import { MEDIA_CACHE, mediaFor, readMediaPath } from './art'
import { QUIZ_MEDIA_ROUTES, quizMediaConfig } from './config'

/** GET /api/quiz-art/<round>, /api/quiz-cry/<round> (fastify). */
const apiQuiz = {
  init(app: FastifyInstance) {
    if (!PROCESS_ENV.ENABLE_SUPABASE) return
    for (const route of QUIZ_MEDIA_ROUTES)
      app.get(route, async (req, reply) => {
        const path = readMediaPath(req.url)
        if (!path) return reply.code(404).send()
        const media = await mediaFor(path.kind, path.round, quizMediaConfig())
        reply.code(media.status).header('Content-Type', media.type)
        if (media.status === 200) reply.header('Cache-Control', MEDIA_CACHE)
        return reply.send(Buffer.from(media.body))
      })
  },
}

export default apiQuiz
