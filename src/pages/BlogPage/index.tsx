import { useGetPokemonBlogsQuery } from 'app/apis/blog'
import BlogCard from 'components/common/BlogCard'
import BlogCardLoading from 'components/common/BlogCard/loading'
import { BlogPageStyled } from './styles'

const BlogPage = () => {
  const [blogListState, setBlogListState] = useState([])
  const { data, isFetching } = useGetPokemonBlogsQuery()

  const blogList =
    !blogListState || !blogListState.length
      ? Array.from({ length: 8 }).map((_, index) => (
          <BlogCardLoading key={index} />
        ))
      : blogListState.map((blog) => <BlogCard key={blog.id} {...blog} />)

  useEffect(() => {
    if (data?.data) {
      setBlogListState(data.data)
    }
  }, [JSON.stringify(data)])

  return <BlogPageStyled>{blogList}</BlogPageStyled>
}

export default BlogPage
