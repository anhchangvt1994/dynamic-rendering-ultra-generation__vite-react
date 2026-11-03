import type { ArticleCard } from 'app/apis/blog'
import Cover from './Cover'
import { articleHref } from './href'
import Stamp from './Stamp'
import { formatDate, readLabel } from './text.mjs'

const RING = 'MỚI NHẤT · MỚI NHẤT · '

/** The newest article: a notebook page on the desk, torn cover, spiral rings. */
export default function Notebook({
  article,
  no,
}: {
  article: ArticleCard
  no: string
}) {
  return (
    <LinkCustom to={articleHref(article.slug)} className="blog-notebook">
      <span className="nb-binding" aria-hidden="true" />
      <svg className="nb-badge" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="48" fill="#e8587d" stroke="#172d45" strokeWidth="3" />
        <circle cx="50" cy="50" r="27" fill="#fffdf7" stroke="#172d45" strokeWidth="3" />
        <defs>
          <path id="nb-ring" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" />
        </defs>
        <g className="ring">
          <text fill="#fff" fontSize="10.5" fontWeight="800">
            <textPath href="#nb-ring" textLength="236" lengthAdjust="spacing">{RING}</textPath>
          </text>
        </g>
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fill="#172d45"
          fontSize="17"
          fontFamily="var(--font-display)"
        >
          {no.replace('Nº ', '')}
        </text>
      </svg>
      <Cover
        src={article.cover_url}
        alt={article.cover_alt}
        color={article.cover_color}
        priority
        className="nb-cover"
      />
      <span className="nb-page">
        <span className="nb-text">
          <span className="nb-kicker">
            {article.tags[0] && <Stamp tag={article.tags[0]} />}
            <span className="nb-new">{no}</span>
          </span>
          <h2 className="nb-title">{article.title}</h2>
          <p className="nb-excerpt">{article.excerpt}</p>
          <span className="nb-foot">
            <p className="nb-meta">
              <time dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
              <span>{readLabel(article.read_minutes)}</span>
            </p>
            <span className="nb-cta" aria-hidden="true">
              Đọc ghi chú
            </span>
          </span>
        </span>
      </span>
    </LinkCustom>
  )
}
