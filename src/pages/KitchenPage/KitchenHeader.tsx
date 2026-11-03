import type { CSSProperties } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import { FLAVOR_INFO } from 'pages/QuizPage/items.mjs'
import { STATS } from './kitchen.mjs'
import type { StatKey } from './engine/types'

export const CHEF_LINES = [
  'Hôm nay nấu gì cho bé cưng nào?',
  'Quả mọng tươi, kem thật mịn!',
  'Món bí ẩn đang chờ bạn khám phá đó!',
  'Nêm nếm theo vị, chỉ số sẽ tự đến~',
  'Bếp đã sẵn sàng, đầu bếp ơi!',
]

export default function KitchenHeader({
  line = CHEF_LINES[0],
  found = 0,
  total = 8,
}: {
  line?: string
  found?: number
  total?: number
}) {
  return (
    <header className="kitchen-hero">
      <div className="chef">
        <img
          src={getPokemonImage(869)}
          alt="Bếp trưởng Alcremie"
          width={150}
          height={150}
        />
        <p className="chef-line">{line}</p>
      </div>
      <div className="kitchen-intro">
        <p className="kitchen-kicker">Tiệm bếp của Nhà Huấn luyện</p>
        <h1 className="kitchen-title">Bếp Pokémon</h1>
        <p className="kitchen-lede">
          Nấu quả mọng, đồ uống và bánh ngọt thành món ăn cho Pokémon. Món nào
          cũng chỉ mang lại điều tốt: vị nào nuôi chỉ số nấy.
        </p>
        <ul className="flavor-key" aria-label="Vị và chỉ số">
          {(Object.keys(FLAVOR_INFO) as (keyof typeof FLAVOR_INFO)[]).map(
            (flavor) => {
              const stat = (Object.keys(STATS) as StatKey[]).find(
                (s) => STATS[s].flavor === flavor
              ) as StatKey
              return (
                <li
                  key={flavor}
                  style={{ '--c': FLAVOR_INFO[flavor].color } as CSSProperties}
                >
                  {FLAVOR_INFO[flavor].label} → <b>{STATS[stat].label}</b>
                </li>
              )
            }
          )}
          <li style={{ '--c': STATS.friendship.color } as CSSProperties}>
            Mọi vị → <b>{STATS.friendship.label}</b>
          </li>
        </ul>
        <p className="kitchen-found">
          Đã khám phá <b>{`${found}/${total}`}</b> món bí ẩn
        </p>
      </div>
    </header>
  )
}

export function KitchenFilter({
  filter = '',
  onFilter,
}: {
  filter?: StatKey | ''
  onFilter?: (stat: StatKey | '') => void
}) {
  return (
    <div className="menu-filter" role="group" aria-label="Lọc theo chỉ số">
      <button
        type="button"
        aria-pressed={!filter}
        disabled={!onFilter}
        onClick={() => onFilter?.('')}
      >
        Tất cả
      </button>
      {(Object.keys(STATS) as StatKey[])
        .filter((stat) => stat !== 'friendship')
        .map((stat) => (
          <button
            key={stat}
            type="button"
            aria-pressed={filter === stat}
            disabled={!onFilter}
            onClick={() => onFilter?.(stat)}
            style={{ '--c': STATS[stat].color } as CSSProperties}
          >
            {STATS[stat].label}
          </button>
        ))}
    </div>
  )
}
