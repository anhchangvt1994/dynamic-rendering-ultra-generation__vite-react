import { BlogDetailStyle } from 'pages/BlogDetailPage/styles'
import { boneCss } from './bone'

const BlogDetailSkeletonStyle = styled(BlogDetailStyle)`
  ${boneCss}
  .blog-cover.bone {
    background-color: var(--bone);
  }
  .blog-tagrow .bone {
    width: 84px;
    height: 24px;
  }
  .blog-title .bone {
    width: 85%;
    height: 24px;
    margin-block: 6px;
  }
  .blog-title .bone:last-child {
    width: 55%;
  }
  .blog-meta .bone {
    width: 180px;
    height: 14px;
    margin-block: 5px;
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
  return (
    <BlogDetailSkeletonStyle
      className="blog-detail-page"
      data-page-skeleton
      aria-busy="true"
      role="status"
      aria-label="Đang tải bài viết…"
    >
      <div className="blog-back" aria-hidden="true" />
      <div className="blog-article" aria-hidden="true">
        <span className="cover bone blog-cover" />
        <div className="blog-head">
          <div className="blog-tagrow">
            <span className="bone" />
          </div>
          <div className="blog-title">
            <span className="bone" />
            <span className="bone" />
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
