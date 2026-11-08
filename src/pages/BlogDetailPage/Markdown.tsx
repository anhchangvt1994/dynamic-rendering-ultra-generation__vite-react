import type { ReactNode } from 'react'

type Inline =
  | { t: 'text' | 'code'; v: string }
  | { t: 'a'; href: string; c: Inline[] }
  | { t: 'b' | 'i'; c: Inline[] }
export type Block =
  | { type: 'h2' | 'h3' | 'p' | 'quote'; inline: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'img'; alt: string; src: string }
  | { type: 'hr' }

const inline = (nodes: Inline[]): ReactNode[] =>
  nodes.map((node, i) => {
    switch (node.t) {
      case 'text':
        return node.v
      case 'code':
        return <code key={i}>{node.v}</code>
      case 'b':
        return <strong key={i}>{inline(node.c)}</strong>
      case 'i':
        return <em key={i}>{inline(node.c)}</em>
      case 'a': {
        const external = /^(https?:)?\/\//i.test(node.href)
        return (
          <a
            key={i}
            href={node.href}
            {...(external
              ? { target: '_blank', rel: 'noopener noreferrer' }
              : {})}
          >
            {inline(node.c)}
          </a>
        )
      }
    }
  })

const textOf = (nodes: Inline[]): string =>
  nodes.map((node) => ('v' in node ? node.v : textOf(node.c))).join('')

export const headingId = (index: number) => `sec-${index}`

/** The h2 headings, for the table of contents. */
export const outlineOf = (blocks: Block[]) =>
  blocks.flatMap((block, i) =>
    block.type === 'h2'
      ? [{ id: headingId(i), text: textOf(block.inline) }]
      : []
  )

/** An article's blocks as React elements: never HTML, only the Markdown subset. */
export default function Markdown({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2 key={i} id={headingId(i)}>
                {inline(block.inline)}
              </h2>
            )
          case 'h3':
            return <h3 key={i}>{inline(block.inline)}</h3>
          case 'p':
            return <p key={i}>{inline(block.inline)}</p>
          case 'quote':
            return (
              <blockquote key={i}>
                <p>{inline(block.inline)}</p>
              </blockquote>
            )
          case 'ul':
          case 'ol': {
            const List = block.type
            return (
              <List key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </List>
            )
          }
          case 'code':
            return (
              <pre key={i} tabIndex={0}>
                <code>{block.text}</code>
              </pre>
            )
          case 'img':
            return (
              <figure key={i}>
                <img src={block.src} alt={block.alt} loading="lazy" />
                {block.alt && <figcaption>{block.alt}</figcaption>}
              </figure>
            )
          case 'hr':
            return <hr key={i} />
        }
      })}
    </>
  )
}
