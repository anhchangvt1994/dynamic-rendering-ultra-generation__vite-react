import { useSearchParams } from 'react-router'
import {
  BLOG_ENABLED,
  listStoreKey,
  useGetArticlesQuery,
} from 'app/apis/blog'
import type { ArticleCard } from 'app/apis/blog'
import BattleMessage from 'components/common/BattleMessage'
import BlogSkeleton from 'components/PageSkeleton/BlogSkeleton'
import Notebook from './Notebook'
import Specimen from './Specimen'
import { noLabel } from './text.mjs'
import { BlogStyle } from './styles'

const tagsOf = (articles: ArticleCard[]) => [
  ...new Set(articles.flatMap((article) => article.tags ?? [])),
]

/**
 * /blogs: the naturalist's desk (docs/superpowers/specs/2026-11-03-field-notes-blog-design.md).
 * The newest note is the notebook page, the rest are specimens; `?tag=` keeps
 * one tag.
 */
export default function BlogPage() {
  setSeoTag({
    title: 'Sổ tay thực địa | Pokédex',
    description:
      'Sổ tay thực địa: hướng dẫn, phân tích và câu chuyện về thế giới Pokémon.',
    'og:title': 'Sổ tay thực địa',
    robots: 'index, follow',
  })

  const {
    data = getAPIStore(listStoreKey()),
    isFetching,
    refetch,
  } = useGetArticlesQuery()
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag') ?? ''
  const setTag = (next: string) =>
    setParams(next ? { tag: next } : {}, { replace: true })

  if (RenderingInfo.loader || (BLOG_ENABLED && isFetching && !data))
    return <BlogSkeleton />

  if (!BLOG_ENABLED)
    return (
      <BattleMessage
        title="Bài viết chưa bật"
        action={{ label: 'Về Pokédex', to: import.meta.env.ROUTER_HOME_PATH }}
      >
        Sổ tay thực địa cần Supabase. Bật nó để đọc các bài viết.
      </BattleMessage>
    )

  // the backend can answer with anything; only a list of articles is shown
  const articles: ArticleCard[] | null = Array.isArray(data) ? data : null

  if (!articles)
    return (
      <BattleMessage
        title="Máy chủ bài viết đã gục ngã!"
        action={{ label: 'Thử lại', onClick: () => refetch() }}
      >
        Không tải được danh sách bài viết. Thử lại sau giây lát.
      </BattleMessage>
    )

  if (!articles.length)
    return (
      <BattleMessage
        title="Chưa có bài viết nào."
        action={{ label: 'Về Pokédex', to: import.meta.env.ROUTER_HOME_PATH }}
      >
        Các ghi chú về Pokémon sẽ xuất hiện ở đây.
      </BattleMessage>
    )

  const tags = tagsOf(articles)
  const visible = tag
    ? articles.filter((article) => article.tags?.includes(tag))
    : articles
  const [newest, ...rest] = visible

  return (
    <BlogStyle className="blog-page">
      <header className="blog-hero">
        <svg className="hero-ball" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#172d45" strokeWidth="6" />
          <path d="M4 50h92" stroke="#172d45" strokeWidth="6" />
          <circle cx="50" cy="50" r="13" fill="none" stroke="#172d45" strokeWidth="6" />
        </svg>
        <h1 className="hero-title">
          <span>Sổ tay thực địa</span>
        </h1>
        <p className="hero-count">{articles.length} ghi chú, mới nhất ở đầu</p>
      </header>

      <div className="blog-tags" role="group" aria-label="Lọc theo nhãn">
        <button
          type="button"
          aria-pressed={!tag}
          onClick={() => setTag('')}
        >
          Tất cả <span className="n">{articles.length}</span>
        </button>
        {tags.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={tag === name}
            onClick={() => setTag(name)}
          >
            {name}{' '}
            <span className="n">
              {articles.filter((article) => article.tags?.includes(name)).length}
            </span>
          </button>
        ))}
      </div>

      {newest ? (
        <>
          <Notebook
            article={newest}
            no={noLabel(articles.length, articles.indexOf(newest))}
          />
          {rest.length > 0 && (
            <ul className="blog-grid">
              {rest.map((article, i) => (
                <Specimen
                  key={article.slug}
                  article={article}
                  index={i}
                  no={noLabel(articles.length, articles.indexOf(article))}
                />
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="blog-empty">
          Chưa có ghi chú nào với nhãn này
          <button type="button" onClick={() => setTag('')}>
            Xem tất cả
          </button>
        </p>
      )}
    </BlogStyle>
  )
}
