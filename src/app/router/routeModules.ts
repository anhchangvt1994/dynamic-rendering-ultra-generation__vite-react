import { ACCOUNTS_ENABLED } from 'app/supabase/client'
import { lazyRoute } from './utils/LazyComponentHandler'

/** Each page's code, loaded on demand and fetched ahead when idle. */
export const ROUTE_MODULES = {
  home: lazyRoute(() => import('pages/HomePage')),
  pokemon: lazyRoute(() => import('pages/PokemonPage')),
  blogs: lazyRoute(() => import('pages/BlogPage')),
  blogDetail: lazyRoute(() => import('pages/BlogDetailPage')),
  quiz: lazyRoute(() => import('pages/QuizPage')),
  compare: lazyRoute(() => import('pages/ComparePage')),
  // ENABLE_SUPABASE off: no page, nothing in the bundle
  account: ACCOUNTS_ENABLED
    ? lazyRoute(() => import('pages/AccountPage'))
    : undefined,
}

/** The page module a path leads to (a locale prefix is not used here). */
export function routeModuleFor(pathname: string) {
  const [, first = '', second] = pathname.split('/')
  switch (first) {
    case '':
      return ROUTE_MODULES.home
    case 'pokemon':
      return second ? ROUTE_MODULES.pokemon : undefined
    case 'blogs':
      return second ? ROUTE_MODULES.blogDetail : ROUTE_MODULES.blogs
    case 'ai-day':
      return ROUTE_MODULES.quiz
    case 'so-sanh':
      return ROUTE_MODULES.compare
    case 'dang-nhap':
      return ROUTE_MODULES.account
    default:
      return undefined
  }
}

const preloadQuietly = (route?: { preload: () => Promise<unknown> }) =>
  route?.preload().catch(() => {
    // fetched again when the page is opened
  })

/** Fetch the page behind a link the reader is about to follow. */
export const preloadPath = (pathname: string) =>
  preloadQuietly(routeModuleFor(pathname))

// the pages most visits move between, most likely first
const IDLE_ORDER = ['home', 'pokemon', 'quiz', 'compare', 'blogs'] as const

/**
 * Once the browser is idle, fetch the main pages one after another, so a
 * navigation finds its code ready. Skipped on Save-Data and 2G.
 */
export function preloadWhenIdle() {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
  ).connection
  if (connection?.saveData || /2g/.test(connection?.effectiveType ?? '')) return

  const idle = (callback: () => void) =>
    'requestIdleCallback' in window
      ? requestIdleCallback(callback, { timeout: 4000 })
      : setTimeout(callback, 2000)

  const next = (index: number) => {
    const name = IDLE_ORDER[index]
    if (!name) return
    idle(() => {
      preloadQuietly(ROUTE_MODULES[name])?.finally(() => next(index + 1))
    })
  }
  next(0)
}
