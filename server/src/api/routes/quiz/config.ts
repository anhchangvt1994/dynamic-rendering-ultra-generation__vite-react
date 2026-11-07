import { PROCESS_ENV } from '../../../utils/InitEnv'
import { supabaseService } from '../supabase/config'
import type { QuizMediaConfig } from './art'

// The service role key reads a round's answer and never reaches the browser.

/** The quiz media proxy's settings. */
export const quizMediaConfig = (): QuizMediaConfig => ({
  ...supabaseService(),
  sprites: String(PROCESS_ENV.POKEAPI_SPRITES_BASE_URL || ''),
})

export const QUIZ_MEDIA_ROUTES = [
  '/api/quiz-art/:round',
  '/api/quiz-cry/:round',
]
