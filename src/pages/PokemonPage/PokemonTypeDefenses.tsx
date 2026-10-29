import { useGetPokemonTypeQuery } from 'app/apis/pokemon'
import { Pokeball } from 'components/common/FieldIcon'
import { ChevronDownIcon } from '@radix-ui/react-icons'
import styled from 'styled-components'
import { getDefenses } from './effectiveness.mjs'

const DefensesStyle = styled.section`
  margin: 0 0 16px;
  padding: 18px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--ink);
  .eyebrow {
    font-size: 11px;
    letter-spacing: 1.6px;
    color: var(--muted);
    font-weight: 700;
  }
  h3 {
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin: 4px 0 14px;
  }
  h4 {
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .type-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .defense-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 33px;
    padding: 4px 6px;
    background: var(--canvas);
    border: 1px solid var(--line);
    border-radius: 9px;
    font-size: 12px;
    font-weight: 600;
  }
  .defense-chip img {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
  .defense-chip strong {
    min-width: 24px;
    padding: 2px 4px;
    margin-left: 2px;
    text-align: center;
    border-radius: 5px;
    background: #e2e8ef;
    color: var(--ink);
    font-size: 11px;
    font-weight: 800;
  }
  .defense-chip[data-factor='4'] strong {
    background: #c64036;
    color: white;
  }
  .defense-chip[data-factor='0'] strong {
    background: var(--ink);
    color: white;
  }
  .empty {
    font-size: 11px;
    color: var(--muted);
  }
  details {
    border-top: 1px solid var(--line);
    margin-top: 14px;
    padding-top: 4px;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    list-style: none;
    cursor: pointer;
    min-height: 42px;
    font-size: 11px;
    font-weight: 600;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    color: var(--focus);
  }
  summary:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 3px;
    border-radius: 6px;
  }
  details[open] summary svg {
    transform: rotate(180deg);
  }
  .resist-group + .resist-group {
    margin-top: 13px;
  }
  .resist-group {
    padding-top: 4px;
  }
  .scope {
    margin-top: 13px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.7 !important;
  }
  .defense-state {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 100px;
    font-size: 11px;
    color: var(--muted);
  }
  .defense-state > svg {
    width: 24px;
    height: 24px;
    flex: none;
  }
  .defense-state button {
    border: 1px solid var(--line);
    background: var(--canvas);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--ink);
    font-size: 11px;
  }
`
const multiplierLabel = (multiplier: number) =>
  multiplier === 0.5 ? '½×' : multiplier === 0.25 ? '¼×' : `${multiplier}×`

export default function PokemonTypeDefenses({ types = [] }: { types: any[] }) {
  const names = types
    .map((entry) => entry.type?.name)
    .filter(Boolean)
    .slice(0, 2)
  const first = useGetPokemonTypeQuery(names[0] || '', { skip: !names[0] })
  const second = useGetPokemonTypeQuery(names[1] || '', { skip: !names[1] })
  if (!names.length) return null
  const resources =
    names.length > 1
      ? [first.currentData, second.currentData]
      : [first.currentData]
  const defenses = getDefenses(resources)
  const failed =
    !defenses.length && (first.isError || (names.length > 1 && second.isError))
  const weak = defenses
    .filter((item) => item.multiplier > 1)
    .sort((a, b) => b.multiplier - a.multiplier)
  const resist = defenses.filter(
    (item) => item.multiplier > 0 && item.multiplier < 1
  )
  const immune = defenses.filter((item) => item.multiplier === 0)
  const chips = (entries) => (
    <div className="type-chips">
      {entries.map((item) => (
        <span
          className="defense-chip"
          key={item.name}
          data-factor={item.multiplier}
        >
          <img
            src={`/images/pokemon-types_${item.name}.webp`}
            width={18}
            height={18}
            alt=""
          />
          {item.label}
          <strong
            aria-label={`Sát thương nhân ${item.multiplier.toLocaleString('vi-VN')}`}
          >
            {multiplierLabel(item.multiplier)}
          </strong>
        </span>
      ))}
    </div>
  )
  return (
    <DefensesStyle aria-label="Điểm yếu và kháng hệ">
      <span className="eyebrow">GÓC CHIẾN THUẬT</span>
      <h3>Điểm yếu & kháng hệ</h3>
      {!defenses.length ? (
        <div className="defense-state" role={failed ? 'alert' : 'status'}>
          <Pokeball />
          {failed ? (
            <div>
              <p>Chưa tải được bảng khắc hệ.</p>
              <button
                type="button"
                onClick={() => {
                  first.refetch()
                  if (names.length > 1) second.refetch()
                }}
              >
                Thử lại
              </button>
            </div>
          ) : (
            <p>Đang tra bảng khắc hệ…</p>
          )}
        </div>
      ) : (
        <>
          <h4>Cẩn thận với</h4>
          {weak.length ? (
            chips(weak)
          ) : (
            <p className="empty">Không có điểm yếu theo tổ hợp hệ này.</p>
          )}
          <details>
            <summary>
              Kháng & miễn nhiễm <ChevronDownIcon width={16} height={16} />
            </summary>
            {resist.length > 0 && (
              <div className="resist-group">
                <h4>Nhận ít sát thương hơn</h4>
                {chips(resist)}
              </div>
            )}
            {immune.length > 0 && (
              <div className="resist-group">
                <h4>Miễn nhiễm</h4>
                {chips(immune)}
              </div>
            )}
            {!resist.length && !immune.length && (
              <p className="empty">Không có kháng hệ hoặc miễn nhiễm.</p>
            )}
          </details>
        </>
      )}
      <p className="scope">
        Sát thương nhận theo hệ trong dòng game chính hiện tại.
        <br />
        Chưa tính khả năng, vật phẩm, thời tiết và ngoại lệ chiêu thức.
      </p>
    </DefensesStyle>
  )
}
