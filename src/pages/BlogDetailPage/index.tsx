import { useMemo } from 'react'
import {
  BLOG_ENABLED,
  detailStoreKey,
  listStoreKey,
  useGetArticleQuery,
  useGetArticlesQuery,
} from 'app/apis/blog'
import type { Article, ArticleCard } from 'app/apis/blog'
import { useNavigateInfo } from 'app/router/context/InfoContext'
import BattleMessage from 'components/common/BattleMessage'
import BlogDetailSkeleton from 'components/PageSkeleton/BlogDetailSkeleton'
import Cover from 'pages/BlogPage/Cover'
import Stamp from 'pages/BlogPage/Stamp'
import { formatDate, noLabel, readLabel } from 'pages/BlogPage/text.mjs'
import { parseMarkdown } from 'pages/BlogPage/markdown.mjs'
import CopyLink from './CopyLink'
import Markdown, { outlineOf } from './Markdown'
import type { Block } from './Markdown'
import Outline from './Outline'
import ReadRail from './ReadRail'
import Related, { nextTwo } from './Related'
import { BlogDetailStyle } from './styles'

const SITE_AUTHOR = 'Pokédex Field Notes'

/** /blogs/:slug: one page of the notebook. */
export default function BlogDetailPage() {
  const route = useRoute()
  const navigateInfo = useNavigateInfo()
  const navigate = useNavigate()
  const { slug } = route.params as { slug: string }

  // currentData belongs to this slug: `data` keeps the previous article's
  // result while the next one loads
  const {
    currentData: data = getAPIStore(detailStoreKey(slug)),
    isFetching,
    refetch,
  } = useGetArticleQuery(slug)
  // the list is on the desk already (cache and store): Related needs no request of its own
  const { data: list = getAPIStore(listStoreKey()) } = useGetArticlesQuery()

  // the backend can answer with anything; only a list of rows is usable
  const rows: Article[] | null = Array.isArray(data) ? data : null
  const article = rows?.[0] ?? null
  const blocks = useMemo(
    () => parseMarkdown(article?.body ?? '') as Block[],
    [article]
  )
  const outline = useMemo(() => outlineOf(blocks), [blocks])
  const related = useMemo(
    () =>
      nextTwo(Array.isArray(list) ? (list as ArticleCard[]) : [], slug),
    [list, slug]
  )

  if (article)
    setSeoTag({
      title: `${article.title} | Sổ tay thực địa`,
      description: article.excerpt,
      'og:type': 'article',
      'og:title': article.title,
      'og:description': article.excerpt,
      'og:url': `${import.meta.env.HOST}${window?.location?.pathname ?? ''}`,
      'og:image': article.cover_url ?? '',
      'twitter:title': article.title,
      'twitter:description': article.excerpt,
      'twitter:image': article.cover_url ?? '',
      robots: 'index, follow',
    })
  else
    setSeoTag({
      title: 'Bài viết không tồn tại | Pokédex',
      robots: 'noindex',
    })

  const back = () =>
    navigateInfo.from
      ? navigate(-1)
      : navigate(import.meta.env.ROUTER_BLOGS_GET_PATH)

  if (RenderingInfo.loader || (BLOG_ENABLED && isFetching && !data))
    return <BlogDetailSkeleton />

  if (!BLOG_ENABLED)
    return (
      <BattleMessage
        title="Bài viết chưa bật"
        action={{ label: 'Về Pokédex', to: import.meta.env.ROUTER_HOME_PATH }}
      >
        Sổ tay thực địa cần Supabase. Bật nó để đọc các bài viết.
      </BattleMessage>
    )

  if (!rows)
    return (
      <BattleMessage
        title="Máy chủ bài viết đã gục ngã!"
        action={{ label: 'Thử lại', onClick: () => refetch() }}
      >
        Không tải được bài viết này. Thử lại sau giây lát.
      </BattleMessage>
    )

  if (!article)
    return (
      <BattleMessage
        title="Bài viết này đã bỏ chạy!"
        action={{
          label: 'Xem các bài viết',
          to: import.meta.env.ROUTER_BLOGS_GET_PATH,
        }}
      >
        Không tìm thấy bài viết với đường dẫn này. Có thể nó đã được đổi tên
        hoặc gỡ xuống.
      </BattleMessage>
    )

  const allList = Array.isArray(list) ? (list as ArticleCard[]) : []
  const at = allList.findIndex((a) => a.slug === slug)
  const no = at >= 0 ? noLabel(allList.length, at) : ''

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    image: article.cover_url ? [article.cover_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at ?? article.published_at,
    author: { '@type': 'Person', name: article.author_name || SITE_AUTHOR },
  }

  return (
    <BlogDetailStyle className="blog-detail-page">
      <ReadRail onBack={back} />
      <article className="blog-article">
        <Cover
          src={article.cover_url}
          alt={article.cover_alt}
          color={article.cover_color}
          priority
          className="blog-cover"
        />
        <header className="blog-head">
          <div className="blog-tagrow">
            {article.tags[0] && <Stamp tag={article.tags[0]} />}
            {no && <span className="blog-no">{no}</span>}
          </div>
          <h1 className="blog-title">{article.title}</h1>
          <p className="blog-meta">
            <time dateTime={article.published_at}>
              {formatDate(article.published_at)}
            </time>
            <span>{readLabel(article.read_minutes)}</span>
            {article.author_name && <span>Bởi {article.author_name}</span>}
          </p>
        </header>
        <aside className="blog-aside">
          <Outline items={outline} />
        </aside>
        <div className="blog-body">
          <Markdown blocks={blocks} />
          <footer className="blog-end">
            <p>Thấy hữu ích? Gửi nó cho một huấn luyện viên khác.</p>
            <div>
              <CopyLink />
              <button type="button" className="blog-all" onClick={back}>
                Về sổ tay
              </button>
            </div>
          </footer>
        </div>
        <script
          type="application/ld+json"
          // `<` escaped: no text in the data can close the script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      </article>
      <Related articles={related} all={allList} />
    </BlogDetailStyle>
  )
}
