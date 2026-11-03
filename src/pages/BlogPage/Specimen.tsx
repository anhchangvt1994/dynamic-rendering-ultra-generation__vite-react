import type { CSSProperties } from 'react'
import type { ArticleCard } from 'app/apis/blog'
import Cover from './Cover'
import { articleHref } from './href'
import Stamp from './Stamp'
import { formatDate, hashAngle, readLabel } from './text.mjs'

/** A card of the desk: a specimen taped to the page, tilted a little. */
export default function Specimen({
  article,
  no,
  index = 0,
  priority = false,
}: {
  article: ArticleCard
  no?: string
  index?: number
  priority?: boolean
}) {
  return (
    <li style={{ '--i': index } as CSSProperties}>
      <LinkCustom
        to={articleHref(article.slug)}
        className="blog-card"
        style={{ '--tilt': `${hashAngle(article.slug)}deg` } as CSSProperties}
      >
        <span className="tape" aria-hidden="true" />
        <Cover
          src={article.cover_url}
          alt={article.cover_alt}
          color={article.cover_color}
          priority={priority}
          className="card-cover"
        >
          {no && <span className="no-tag">{no}</span>}
        </Cover>
        {article.tags[0] && <Stamp tag={article.tags[0]} className="on-card" />}
        <h3 className="card-title">{article.title}</h3>
        <p className="card-excerpt">{article.excerpt}</p>
        <p className="card-meta">
          <time dateTime={article.published_at}>
            {formatDate(article.published_at)}
          </time>
          <span>{readLabel(article.read_minutes)}</span>
          <span className="go" aria-hidden="true" />
        </p>
      </LinkCustom>
    </li>
  )
}
