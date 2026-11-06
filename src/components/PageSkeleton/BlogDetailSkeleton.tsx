import blogApi, { listStoreKey } from 'app/apis/blog'
import store from 'app/store'
import type { ArticleCard } from 'app/apis/blog'
import { BlogDetailStyle } from 'pages/BlogDetailPage/styles'
import { boneCss } from './bone'

const selectList = blogApi.endpoints.getArticles.select()

// the title this slug's card on the list carries, when the list is in
// (read, not subscribed: the skeleton may render outside the store's Provider)
const knownTitle = () => {
  const cached = selectList(store.getState() as never).data
  const list = cached ?? getAPIStore(listStoreKey())
  const slug = decodeURIComponent(
    (typeof location === 'undefined' ? '' : location.pathname)
      .replace(/\/+$/, '')
      .split('/')
      .pop() ?? ''
  )
  return Array.isArray(list)
    ? (list as ArticleCard[]).find((card) => card.slug === slug)?.title
    : undefined
}

const BlogDetailSkeletonStyle = styled(BlogDetailStyle)`
  ${boneCss}
  .rail-back.bone {
    width: 104px;
    padding: 0;
    border-color: transparent;
    border-radius: 999px;
    box-shadow: none;
  }
  .blog-cover.bone {
    background-color: var(--bone);
  }
  .blog-tagrow .bone {
    width: 84px;
    height: 24px;
  }
  /* one bone per line, on the title's line pitch: 1.5em (the reset's
     line-height: 1.5 !important wins over the title's own 1.35) */
  .blog-title--bones {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    padding-block: 0.25em;
  }
  .blog-title .bone {
    width: 85%;
    height: 1em;
  }
  .blog-title .bone:nth-child(2) {
    width: 62%;
  }
  .blog-title .bone:nth-child(3) {
    display: none;
    width: 48%;
  }
  /* narrow phones set most titles on three lines */
  @media (max-width: 359px) {
    .blog-title .bone:nth-child(2) {
      width: 92%;
    }
    .blog-title .bone:nth-child(3) {
      display: block;
    }
  }
  /* the title known from the list: its own words, hidden under bones that
     wrap line by line exactly as the loaded title will */
  .blog-title .title-ghost {
    color: transparent;
    /* not a .bone: its tone is set here */
    background: #e3e9f0;
    border-radius: 6px;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  /* one 21px meta line (14px × 1.5) */
  .blog-meta .bone {
    width: 180px;
    height: 14px;
    margin-block: 3.5px;
  }
  .blog-body .bone {
    height: 14px;
    margin-bottom: 14px;
  }
  .blog-body .bone:nth-child(4n) {
    width: 60%;
  }
`

/** /blogs/:slug while it loads: the cover, the title strip and the paragraphs as blocks. */
export default function BlogDetailSkeleton() {
  const title = knownTitle()
  return (
    <BlogDetailSkeletonStyle
      className="blog-detail-page"
      data-page-skeleton
      aria-busy="true"
      role="status"
      aria-label="Đang tải bài viết…"
    >
      <div className="read-rail" aria-hidden="true">
        <div className="read-inner">
          <span className="rail-back bone" />
          <span className="read-trail" />
        </div>
      </div>
      <div className="blog-article" aria-hidden="true">
        <span className="cover bone blog-cover" />
        <div className="blog-head">
          <div className="blog-tagrow">
            <span className="bone" />
          </div>
          <div
            className={title ? 'blog-title' : 'blog-title blog-title--bones'}
          >
            {title ? (
              <span className="title-ghost">{title}</span>
            ) : (
              <>
                <span className="bone" />
                <span className="bone" />
                <span className="bone" />
              </>
            )}
          </div>
          <div className="blog-meta">
            <span className="bone" />
          </div>
        </div>
        <aside className="blog-aside" />
        <div className="blog-body">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="bone" />
          ))}
        </div>
      </div>
    </BlogDetailSkeletonStyle>
  )
}
