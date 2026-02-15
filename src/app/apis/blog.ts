import {
  getApiProxyUrl,
  getBlogDetailPath,
  getSearchArticlesByTitlePath,
} from 'utils/ApiHelper'

const proxyApi = ProxyAPI.init({
  targetBaseUrl: import.meta.env.API_BASE_STRAPI_URL,
})

const blogApi = createApi({
  reducerPath: import.meta.env.API_REDUCER_PATH_STRAPI,
  baseQuery: fetchBaseQuery({
    baseUrl: getApiProxyUrl(),
  }),
  endpoints: (builder) => ({
    [import.meta.env.API_ENDPOINT_GET_POKEMON_BLOGS]: builder.query<any, void>({
      query: () =>
        proxyApi.get(import.meta.env.API_PATH_GET_POKEMON_BLOGS, {
          expiredTime: 'infinite',
          cacheKey: import.meta.env.API_ENDPOINT_GET_POKEMON_BLOGS,
          enableStore: true,
        }),
    }),
    [import.meta.env.API_ENDPOINT_GET_POKEMON_BLOG_DETAIL]: builder.query<
      any,
      string
    >({
      query: (slug: string) => {
        const path = getBlogDetailPath(slug)

        return proxyApi.get(path, {
          expiredTime: 'infinite',
          cacheKey: path,
          enableStore: true,
        })
      },
    }),
    [import.meta.env.API_ENDPOINT_SEARCH_ARTICLES_BY_TITLE]: builder.query<
      any,
      string
    >({
      query: (searchTerm: string) => {
        if (!searchTerm) return

        const path = getSearchArticlesByTitlePath(searchTerm)

        return proxyApi.get(path, {
          expiredTime: 'infinite',
          cacheKey: path,
          enableStore: true,
        })
      },
    }),
  }),
})

export const {
  useGetPokemonBlogsQuery,
  useGetPokemonBlogDetailQuery,
  useSearchArticlesByTitleQuery,
} = blogApi

export default blogApi
