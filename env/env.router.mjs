export default {
  prefix: 'router',
  data: {
    base: {
      path: '/',
    },
    home: {
      path: '/',
      id: 'HomePage',
      title: 'Home',
      icon: 'home',
    },
    pokemon: {
      path: 'pokemon/:name',
      get_path: (name) => `/pokemon/${name}`,
      id: 'PokemonPage',
      title: 'Pokemon Detail',
    },
    blogs: {
      path: 'blogs',
      get_path: '/blogs',
      id: 'BlogPage',
      title: 'Blogs',
      icon: 'article',
    },
    blog_detail: {
      path: 'blogs/:slug',
      get_path: (slug) => `/blogs/${slug}`,
      id: 'BlogDetailPage',
      title: 'Blog Detail',
    },

    not_found: {
      path: '*',
    },
  },
}
