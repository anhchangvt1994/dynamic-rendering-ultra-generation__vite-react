export default {
  prefix: 'router',
  data: {
    base: {
      path: '/',
    },
    home: {
      path: '/',
      id: 'HomePage',
    },
    pokemon: {
      path: 'pokemon/:name',
      get_path: (name) => `/pokemon/${name}`,
      id: 'PokemonPage',
    },
    blogs: {
      path: 'blogs',
      get_path: '/blogs',
      id: 'BlogPage',
    },
    blog_detail: {
      path: 'blogs/:slug',
      get_path: (slug) => `/blogs/${slug}`,
      id: 'BlogDetailPage',
    },

    not_found: {
      path: '*',
    },
  },
}
