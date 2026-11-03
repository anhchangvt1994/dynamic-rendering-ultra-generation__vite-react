import { useEffect, useState } from 'react'

const scrollerOf = (node: HTMLElement | null) => {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY
    if (overflow === 'auto' || overflow === 'scroll') return el
  }
  return null
}

/**
 * "Mục lục": the h2 headings of a long article, the one being read marked.
 * Only shown beside the text on a wide screen (CSS); a click scrolls to it.
 */
export default function Outline({
  items,
}: {
  items: { id: string; text: string }[]
}) {
  const [active, setActive] = useState(items[0]?.id ?? '')
  const [node, setNode] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const scroller = scrollerOf(node)
    if (!node || !scroller || typeof IntersectionObserver === 'undefined')
      return
    const seen = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          entry.isIntersecting
            ? seen.add(entry.target.id)
            : seen.delete(entry.target.id)
        // the first heading in view, else the last one passed
        const first = items.find((item) => seen.has(item.id))
        if (first) setActive(first.id)
      },
      { root: scroller, rootMargin: '0px 0px -60% 0px' }
    )
    for (const item of items) {
      const heading = document.getElementById(item.id)
      if (heading) observer.observe(heading)
    }
    return () => observer.disconnect()
  }, [items, node])

  if (items.length < 2) return null
  return (
    <nav className="blog-outline" aria-label="Mục lục" ref={setNode}>
      <p>Trong trang này</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              aria-current={active === item.id ? 'true' : undefined}
              onClick={() => {
                const reduce = window.matchMedia(
                  '(prefers-reduced-motion: reduce)'
                ).matches
                document
                  .getElementById(item.id)
                  ?.scrollIntoView({
                    behavior: reduce ? 'auto' : 'smooth',
                    block: 'start',
                  })
                setActive(item.id)
              }}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
