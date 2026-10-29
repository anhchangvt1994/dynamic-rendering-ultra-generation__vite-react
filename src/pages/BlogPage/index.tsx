import BattleMessage from 'components/common/BattleMessage'
import { useGetPokemonBlogsQuery } from 'app/apis/blog'
import BlogCard from 'components/common/BlogCard'
import BlogCardLoading from 'components/common/BlogCard/loading'
import { BlogPageStyled } from './styles'

const BlogPage = () => {
  setSeoTag({
    title: 'Bài viết về Pokémon | Pokédex',
    description: 'Hướng dẫn, phân tích và câu chuyện về thế giới Pokémon.',
    'og:title': 'Bài viết về Pokémon',
    robots: 'index, follow',
  })

  const {
    data = getAPIStore(import.meta.env.API_ENDPOINT_GET_POKEMON_BLOGS),
    isFetching,
    refetch,
  } = useGetPokemonBlogsQuery()
  const isShowLoading = RenderingInfo.loader || (isFetching && !data)
  // The backend can answer with anything (or nothing); only an article list
  // is renderable, everything else is an error the reader can retry.
  const articles = Array.isArray(data?.data) ? data.data : null

  if (isShowLoading) {
    return (
      <BlogPageStyled>
        {Array.from({ length: 8 }).map((_, index) => (
          <BlogCardLoading key={index} />
        ))}
      </BlogPageStyled>
    )
  }

  if (!articles) {
    return (
      <BattleMessage
        title="Máy chủ bài viết đã gục ngã!"
        action={{ label: 'Thử lại', onClick: () => refetch() }}
      >
        Không tải được danh sách bài viết. Thử lại sau giây lát.
      </BattleMessage>
    )
  }

  if (!articles.length) {
    return (
      <BattleMessage
        title="Chưa có bài viết nào."
        action={{ label: 'Về Pokédex', to: import.meta.env.ROUTER_HOME_PATH }}
      >
        Các bài viết về Pokémon sẽ xuất hiện ở đây.
      </BattleMessage>
    )
  }

  return (
    <BlogPageStyled>
      {articles.map((blog) => (
        <BlogCard key={blog.id} {...blog} />
      ))}
    </BlogPageStyled>
  )
}

export default BlogPage
