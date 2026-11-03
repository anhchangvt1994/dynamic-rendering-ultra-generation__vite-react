import { BlogStyle } from 'pages/BlogPage/styles'
import { boneCss } from './bone'

const BlogSkeletonStyle = styled(BlogStyle)`
  ${boneCss}
  /* blocks only: every row is held by BlogStyle's fixed line heights, the
     same boxes as the loaded page */
  .hero-title .bone {
    width: min(380px, 80%);
    height: 100%;
    border-radius: 10px;
  }
  .hero-count .bone {
    width: 220px;
    height: 14px;
    margin-block: 5px;
  }
  .blog-tags .bone {
    width: 92px;
    height: 44px;
  }
  .nb-kicker .bone {
    width: 84px;
    height: 24px;
  }
  .nb-title .bone,
  .card-title .bone {
    width: 90%;
    height: 22px;
    margin-bottom: 10px;
  }
  .nb-title .bone:last-child,
  .card-title .bone:last-child {
    width: 60%;
  }
  .nb-title {
    display: block;
  }
  .nb-excerpt .bone,
  .card-excerpt .bone {
    height: 12px;
    margin-block: 6px;
  }
  .nb-excerpt .bone:last-child,
  .card-excerpt .bone:last-child {
    width: 70%;
  }
  .nb-meta .bone,
  .card-meta .bone {
    width: 120px;
    height: 12px;
  }
  .nb-cta.bone {
    width: 120px;
    padding: 0;
  }
  .card-title,
  .card-excerpt {
    display: block;
  }
  .cover.bone {
    background-color: var(--bone);
  }
`

// the desk as it will be: the notebook page and five specimens
const CARDS = 5

/** /blogs while it loads: blocks the size of what is coming, no text. */
export default function BlogSkeleton() {
  return (
    <BlogSkeletonStyle
      className="blog-page"
      data-page-skeleton
      aria-busy="true"
      role="status"
      aria-label="Đang tải sổ tay…"
    >
      <header className="blog-hero" aria-hidden="true">
        <div className="hero-title">
          <span className="bone" />
        </div>
        <div className="hero-count">
          <span className="bone" />
        </div>
      </header>
      <div className="blog-tags" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="bone bone--pill" />
        ))}
      </div>
      <div className="blog-notebook" aria-hidden="true">
        <span className="nb-binding" />
        <span className="cover bone nb-cover" />
        <span className="nb-page">
          <span className="nb-text">
            <span className="nb-kicker">
              <span className="bone" />
            </span>
            <span className="nb-title">
              <span className="bone" />
              <span className="bone" />
            </span>
            <span className="nb-excerpt">
              <span className="bone" />
              <span className="bone" />
              <span className="bone" />
            </span>
            <span className="nb-meta">
              <span className="bone" />
            </span>
            <span className="nb-cta bone" />
          </span>
        </span>
      </div>
      <ul className="blog-grid" aria-hidden="true">
        {Array.from({ length: CARDS }, (_, i) => (
          <li key={i}>
            <div className="blog-card">
              <span className="cover bone card-cover" />
              <h3 className="card-title">
                <span className="bone" />
                <span className="bone" />
              </h3>
              <p className="card-excerpt">
                <span className="bone" />
                <span className="bone" />
              </p>
              <p className="card-meta">
                <span className="bone" />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </BlogSkeletonStyle>
  )
}
