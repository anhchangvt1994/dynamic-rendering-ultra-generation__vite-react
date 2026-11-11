/** The page title as a lit sign: letters switch on left to right, then a slow chase runs along them. */
export default function Marquee({ text, lead }: { text: string; lead: string }) {
  let n = 0
  return (
    <section data-region="title" style={{ ['--n' as string]: 0 }}>
      <h1 className="mq" aria-label={text}>
        {text.split(' ').map((word, w) => (
          <span key={w} className="mq-word" aria-hidden="true">
            {[...word].map((ch) => (
              <span key={n} className="mq-ch" style={{ ['--i' as string]: n++ }}>
                {ch}
              </span>
            ))}
            {w < text.split(' ').length - 1 ? ' ' : ''}
          </span>
        ))}
      </h1>
      <p className="hub-sub">{lead}</p>
    </section>
  )
}
