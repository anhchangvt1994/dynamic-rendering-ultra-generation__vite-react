import { getApiProxyUrl } from 'utils/ApiHelper'

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
  }),
})

export const { useGetPokemonBlogsQuery } = blogApi

export default blogApi
