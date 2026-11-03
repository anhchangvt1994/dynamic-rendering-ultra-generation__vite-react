import { getApiProxyUrl } from 'utils/ApiHelper'
import {
  articleListPath,
  articlePath,
  articleSearchPath,
  restHeaders,
} from './blogPaths.mjs'

/**
 * NOTE - The blog's articles live in Supabase (PostgREST), read through the
 * apiProxy like every other API: its cache (stale-while-revalidate, so a
 * change made in Studio shows within renewTime) and the API store (the ISR
 * snapshot carries the data). Data comes back as PostgREST rows (arrays).
 */
export const BLOG_ENABLED =
  import.meta.env.SUPABASE_CLIENT_ENABLED === true &&
  !!import.meta.env.SUPABASE_CLIENT_URL

// a change in Studio is on the page within about a minute
export const BLOG_RENEW_MS = 60000

export type ArticleCard = {
  slug: string
  title: string
  excerpt: string
  cover_url: string | null
  cover_alt: string
  cover_color: string
  tags: string[]
  published_at: string
  read_minutes: number
}

export type Article = ArticleCard & {
  id: string
  body: string
  author_id: string | null
  author_name: string | null
  like_count: number
  updated_at: string
}

export type ArticleHit = Pick<
  ArticleCard,
  'slug' | 'title' | 'excerpt' | 'cover_url' | 'cover_color'
>

const proxyApi = ProxyAPI.init({
  targetBaseUrl: `${import.meta.env.SUPABASE_CLIENT_URL}/rest/v1`,
})

// what the proxy asks for: the same for a list, a page and a search
const cached = (path: string) =>
  BLOG_ENABLED
    ? proxyApi.get(path, {
        expiredTime: 'infinite',
        renewTime: BLOG_RENEW_MS,
        cacheKey: path,
        enableStore: true,
      })
    : ''

// the keys of the API store (`getAPIStore`) for the first paint
export const listStoreKey = () => articleListPath()
export const detailStoreKey = (slug: string) => articlePath(slug)
export const searchStoreKey = (term: string) => articleSearchPath(term)

const blogApi = createApi({
  // NOTE - typed as string like pokemonApi's, so both fit one store
  reducerPath: 'blogApi' as string,
  baseQuery: fetchBaseQuery({
    baseUrl: getApiProxyUrl(),
    // the publishable key is public: the proxy forwards the client's headers
    prepareHeaders: (headers) => {
      const extra = restHeaders(import.meta.env.SUPABASE_CLIENT_PUBLISHABLE_KEY)
      for (const [name, value] of Object.entries(extra))
        headers.set(name, value as string)
      return headers
    },
  }),
  endpoints: (builder) => ({
    getArticles: builder.query<ArticleCard[], void>({
      query: () => cached(listStoreKey()),
    }),
    getArticle: builder.query<Article[], string>({
      query: (slug) => cached(detailStoreKey(slug)),
    }),
    searchArticles: builder.query<ArticleHit[], string>({
      query: (term) => {
        const path = searchStoreKey(term)
        return path ? cached(path) : ''
      },
    }),
  }),
})

type Options = { skip?: boolean }

export const useGetArticlesQuery = (options: Options = {}) =>
  blogApi.useGetArticlesQuery(undefined, {
    ...options,
    skip: !BLOG_ENABLED || options.skip,
  })
export const useGetArticleQuery = (slug: string, options: Options = {}) =>
  blogApi.useGetArticleQuery(slug, {
    ...options,
    skip: !BLOG_ENABLED || !slug || options.skip,
  })
export const useSearchArticlesQuery = (term: string, options: Options = {}) =>
  blogApi.useSearchArticlesQuery(term, {
    ...options,
    skip: !BLOG_ENABLED || !searchStoreKey(term) || options.skip,
  })

export default blogApi
