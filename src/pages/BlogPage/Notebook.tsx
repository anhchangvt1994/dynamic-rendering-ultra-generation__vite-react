import type { ArticleCard } from 'app/apis/blog'
import Cover from './Cover'
import { articleHref } from './href'
import Stamp from './Stamp'
import { formatDate, readLabel } from './text.mjs'

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
      <span className="nb-ribbon" aria-hidden="true">
        <small>Mới</small>
        {no.replace('Nº ', '')}
      </span>
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
