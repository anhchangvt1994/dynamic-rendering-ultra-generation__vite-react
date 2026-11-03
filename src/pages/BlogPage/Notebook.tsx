import type { ArticleCard } from 'app/apis/blog'
import Cover from './Cover'
import { articleHref } from './href'
import Stamp from './Stamp'
import { formatDate, readLabel } from './text.mjs'

/** The newest article: a notebook page on the desk, torn cover, spiral rings. */
export default function Notebook({ article }: { article: ArticleCard }) {
  return (
    <LinkCustom to={articleHref(article.slug)} className="blog-notebook">
      <span className="nb-binding" aria-hidden="true" />
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
            <span className="nb-new">Trang mới nhất</span>
          </span>
          <h2 className="nb-title">{article.title}</h2>
          <p className="nb-excerpt">{article.excerpt}</p>
          <p className="nb-meta">
            <time dateTime={article.published_at}>
              {formatDate(article.published_at)}
            </time>
            <span>{readLabel(article.read_minutes)}</span>
          </p>
          <span className="nb-cta" aria-hidden="true">
            Đọc bài
          </span>
        </span>
      </span>
    </LinkCustom>
  )
}
