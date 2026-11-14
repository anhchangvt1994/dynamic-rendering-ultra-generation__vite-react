import { MapStyle } from 'pages/MapPage/styles'

/** /ban-do while it loads: the night sky and the same top and bottom bars. */
export default function MapSkeleton() {
  return (
    <MapStyle data-page-skeleton role="status" aria-busy="true" aria-label="Đang tải bản đồ…">
      <div className="mp-veil">
        <div />
      </div>
    </MapStyle>
  )
}
