// The pocket while the bag is on its way, in the grid's own boxes: the page
// skeleton and the page itself draw it, so the hand-over moves nothing.
export default function BagBones({ slots = 12 }: { slots?: number }) {
  return (
    <div className="bag-body" aria-hidden="true">
      <ol className="bag-grid">
        {Array.from({ length: slots }, (_, i) => (
          <li key={i}>
            <span className="slot" data-bone style={{ ['--i' as string]: i }}>
              <span className="slot-well">
                <span className="catch-ball" />
              </span>
              <span className="slot-name">
                <span className="bone" />
              </span>
            </span>
          </li>
        ))}
      </ol>
      <div className="bag-detail">
        <span className="bone bag-detail-bone" />
      </div>
    </div>
  )
}
