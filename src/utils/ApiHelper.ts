import { functionGenerator } from './EnvHelper'

export const getApiProxyUrl = functionGenerator(
  import.meta.env.API_PROXY_URL_GET_FUNCTION
)

export const getPokemonListPath = functionGenerator(
  import.meta.env.API_PATH_GET_POKEMON_LIST_FUNCTION
)

export const getPokemonDetailPath = functionGenerator(
  import.meta.env.API_PATH_GET_POKEMON_DETAIL_FUNCTION
)

export const getBlogDetailPath = functionGenerator(
  import.meta.env.API_PATH_GET_POKEMON_BLOG_DETAIL_FUNCTION
)

export const getSearchArticlesByTitlePath = functionGenerator(
  import.meta.env.API_PATH_SEARCH_ARTICLES_BY_TITLE_FUNCTION
)
