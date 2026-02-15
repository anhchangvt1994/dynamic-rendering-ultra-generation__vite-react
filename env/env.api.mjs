export default {
  prefix: 'api',
  data: {
    proxy_url: {
      get: () => window.location.origin,
    },
    base_url: 'https://pokeapi.co/api/v2',
    base_strapi_url: 'https://anhchangvt1994.com/strapi',
    path: {
      get_pokemon_list: (limit = 20, offset = 0) =>
        `/pokemon?limit=${limit}&offset=${offset}`,

      get_pokemon_detail: (name) => `/pokemon/${name}`,

      get_pokemon_blogs:
        '/articles?fields=title,slug,content&populate[coverImage][fields]=id,name,url,blurhash',

      get_pokemon_blog_detail: (slug) =>
        `/articles?filters[slug][$eq]=${slug}&fields=title,slug,content&populate[coverImage][fields]=id,name,url,blurhash`,

      search_articles_by_title: (searchTerm) =>
        `/articles?filters[title][$containsi]=${searchTerm}&fields=title,slug,content&populate[coverImage][fields]=id,name,url,blurhash`,
    },
    reducer_path: {
      pokemon: 'pokemonApi',
      strapi: 'strapiApi',
    },
    endpoint: {
      get_pokemon_list: 'getPokemonList',
      get_pokemon_detail: 'getPokemonDetail',
      get_pokemon_blogs: 'getPokemonBlogs',
      get_pokemon_blog_detail: 'getPokemonBlogDetail',
      search_articles_by_title: 'searchArticlesByTitle',
    },
  },
}
