// Decorative string of bulbs under the nav; sway/twinkle live in styles.hub.
const COUNT = 12

export default function Bulbs() {
  return (
    <div className="hub-bulbs" aria-hidden="true">
      <ol>
        {Array.from({ length: COUNT }, (_, i) => (
          <li key={i} style={{ ['--i' as string]: i }} />
        ))}
      </ol>
    </div>
  )
}
