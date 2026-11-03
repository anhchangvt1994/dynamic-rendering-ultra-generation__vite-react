import type { ArticleCard } from 'app/apis/blog'
import Specimen from 'pages/BlogPage/Specimen'

// the two articles after this one, older first; the newest wraps to the start
export const nextTwo = (articles: ArticleCard[], slug: string) => {
  const at = articles.findIndex((article) => article.slug === slug)
  const others = articles.filter((article) => article.slug !== slug)
  if (!others.length) return []
  const start = at < 0 ? 0 : Math.min(at, others.length)
  return [...others.slice(start), ...others.slice(0, start)].slice(0, 2)
}

/** "Đọc tiếp": two more specimens from the desk. */
export default function Related({ articles }: { articles: ArticleCard[] }) {
  if (!articles.length) return null
  return (
    <section className="blog-related" aria-labelledby="blog-related-title">
      <h2 id="blog-related-title">Đọc tiếp</h2>
      <ul className="blog-grid">
        {articles.map((article) => (
          <Specimen key={article.slug} article={article} />
        ))}
      </ul>
    </section>
  )
}
