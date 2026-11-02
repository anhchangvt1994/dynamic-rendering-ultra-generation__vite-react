import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { getPokemonImage } from 'pages/PokemonPage/navigation.mjs'
import {
  FLAVOR_INFO,
  TIERS,
  itemById,
  itemSprite,
} from 'pages/QuizPage/items.mjs'
import { refreshBag, useBagStore } from 'pages/BagPage/bagStore'
import { STATS, hintText, recipeKey } from './kitchen.mjs'
import { useKitchenEngine } from './engine/useKitchenEngine'
import type { CookResult, DishView, Menu, StatKey } from './engine/types'
import DishArt from './DishArt'
import Pot, { potFlavors } from './Pot'
import CookFx, { COOK_MS, StatChips } from './CookFx'
import { KitchenStyle } from './styles'

const CHEF = 869 // Alcremie
const LINES = [
  'Hôm nay nấu gì cho bé cưng nào?',
  'Quả mọng tươi, kem thật mịn!',
  'Món bí ẩn đang chờ bạn khám phá đó!',
  'Nêm nếm theo vị, chỉ số sẽ tự đến~',
  'Bếp đã sẵn sàng, đầu bếp ơi!',
]
const ERRORS: Record<string, string> = {
  missing: 'Thiếu nguyên liệu: túi đồ vừa thay đổi, kệ đã được tải lại.',
  bad_pot: 'Nồi cần từ 2 đến 4 nguyên liệu.',
  not_food: 'Có thứ không ăn được trong nồi.',
  unknown_dish: 'Món này chưa có trong thực đơn.',
  sign_in: 'Đăng nhập để vào bếp.',
}

type Count = Record<string, number>

// what a recipe needs, per ingredient
const needsOf = (ingredients: string[]) => {
  const need: Count = {}
  for (const id of ingredients) need[id] = (need[id] ?? 0) + 1
  return need
}
const canCook = (dish: DishView, bag: Count) =>
  !!dish.ingredients &&
  Object.entries(needsOf(dish.ingredients)).every(
    ([id, n]) => (bag[id] ?? 0) >= n
  )

function MenuCard({
  dish,
  bag,
  cooked,
  guest,
  busy,
  onCook,
  onTry,
}: {
  dish: DishView
  bag: Count
  cooked: number
  guest: boolean
  busy: boolean
  onCook: () => void
  onTry: () => void
}) {
  const ready = canCook(dish, bag)
  const tier = TIERS[dish.rarity as keyof typeof TIERS]
  return (
    <li
      className="menu-card"
      data-dish={dish.id}
      data-ready={ready || undefined}
      data-secret={!dish.known || undefined}
      style={{ '--tier': tier.color } as CSSProperties}
    >
      <DishArt
        kind={dish.kind}
        top={dish.top}
        secret={!dish.known}
        size={88}
        steam={ready}
      />
      <div className="menu-body">
        <p className="menu-kicker">
          {'★'.repeat(dish.rarity)} {dish.known ? tier.label : 'Món bí ẩn'}
          {cooked > 0 && <span className="cooked"> · đã nấu {cooked}</span>}
        </p>
        {dish.known ? (
          <>
            <h3 className="dish-name">{dish.name}</h3>
            {dish.stats && <StatChips stats={dish.stats} />}
            <ul className="recipe" aria-label="Công thức">
              {Object.entries(needsOf(dish.ingredients ?? [])).map(
                ([id, n]) => {
                  const have = bag[id] ?? 0
                  return (
                    <li key={id} data-short={have < n || undefined}>
                      <img
                        src={itemSprite(id)}
                        alt=""
                        width={24}
                        height={24}
                        loading="lazy"
                      />
                      {itemById(id).name}
                      <b>{`${have}/${n}`}</b>
                    </li>
                  )
                }
              )}
            </ul>
          </>
        ) : (
          <>
            <h3 className="dish-name dish-unknown">
              <span aria-hidden="true">???</span>
              <span className="sr-only">Món bí ẩn</span>
            </h3>
            <p className="menu-hint">{hintText(dish)}</p>
          </>
        )}
      </div>
      {dish.known ? (
        <button
          type="button"
          className="cook"
          disabled={guest || !ready || busy}
          onClick={onCook}
          aria-label={`Nấu ${dish.name}`}
        >
          Nấu
        </button>
      ) : (
        <button type="button" className="try" onClick={onTry}>
          Thử ở Tự pha chế
        </button>
      )}
    </li>
  )
}

/**
 * The Pokémon Kitchen: the bag's berries, drinks and sweets cooked into
 * dishes that only ever give (docs/superpowers/specs/2026-11-02-kitchen-design.md).
 * A menu of known dishes, a pot to find the secret ones.
 */
export default function KitchenPage() {
  setSeoTag({
    title: 'Bếp Pokémon – Chế biến món ăn cho Pokémon | Pokédex',
    description:
      'Bếp Pokémon: nấu quả mọng, đồ uống và bánh ngọt thành Poffin, bánh kem, cà ri… tăng Thân thiện, Sức mạnh, Sắc đẹp, Linh hoạt, Trí tuệ và Hạnh phúc cho Pokémon.',
    robots: 'noindex, follow',
  })

  const engine = useKitchenEngine()
  const { bag: bagOrNull } = useBagStore()
  const bag = bagOrNull ?? {}
  const guest = engine?.kind === 'guest'
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dishes, setDishes] = useState<Count>({})
  const [tab, setTab] = useState<'menu' | 'pot'>('menu')
  const [filter, setFilter] = useState<StatKey | ''>('')
  const [pot, setPot] = useState<string[]>([])
  const [cooking, setCooking] = useState<{
    pot: string[]
    result: CookResult | null
  } | null>(null)
  const [note, setNote] = useState('')
  const [line] = useState(() => LINES[Math.floor(Math.random() * LINES.length)])

  const load = useCallback(() => {
    if (!engine) return
    engine
      .menu()
      .then(setMenu)
      .catch(() => setNote('Không tải được thực đơn.'))
    engine
      .dishes()
      .then(setDishes)
      .catch(() => {})
  }, [engine])
  useEffect(load, [load])

  // NOTE - What can be cooked comes first, else the menu's order. The order
  // is set when the menu opens or the filter changes, not after each cook:
  // cards jumping around under the player's eyes (a layout shift)
  const [order, setOrder] = useState<string[]>([])
  const ready = Boolean(menu && bagOrNull)
  useEffect(() => {
    if (!menu || !bagOrNull) return
    setOrder(
      [...menu.dishes]
        .sort(
          (a, b) =>
            Number(canCook(b, bagOrNull)) - Number(canCook(a, bagOrNull))
        )
        .map((dish) => dish.id)
    )
    // only on opening and on a new filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, filter])
  const shown = useMemo(() => {
    const rank = (id: string) => {
      const at = order.indexOf(id)
      return at < 0 ? order.length : at
    }
    return (menu?.dishes ?? [])
      .filter(
        (dish) =>
          !filter ||
          (dish.stats
            ? (dish.stats[filter] ?? 0) > 0
            : dish.top.includes(filter))
      )
      .sort((a, b) => rank(a.id) - rank(b.id))
  }, [menu, filter, order])

  const cook = (dish: string | null, ingredients: string[]) => {
    if (!engine || cooking) return
    setNote('')
    setCooking({ pot: ingredients, result: null })
    const started = performance.now()
    engine
      .cook(dish, dish ? null : ingredients)
      .then(async (result) => {
        // the pot has its moment, however fast the answer
        const rest = COOK_MS - (performance.now() - started)
        if (rest > 0) await new Promise((r) => setTimeout(r, rest))
        setCooking({ pot: ingredients, result })
        if (!dish) setPot([])
        refreshBag()
        load()
      })
      .catch((error: Error) => {
        setCooking(null)
        setNote(ERRORS[error.message] ?? 'Bếp đang bận, thử lại sau nhé.')
        refreshBag()
      })
  }

  const sums = potFlavors(cooking?.pot ?? pot)
  const strongest = (Object.keys(sums) as (keyof typeof FLAVOR_INFO)[]).sort(
    (a, b) => sums[b] - sums[a]
  )[0]
  const potKnown = menu?.dishes.find(
    (dish) => dish.ingredients && recipeKey(dish.ingredients) === recipeKey(pot)
  )

  const signIn = (
    <LinkCustom className="sign-in-cook" to="/dang-nhap">
      Đăng nhập để vào bếp
    </LinkCustom>
  )

  return (
    <KitchenStyle className="kitchen-page">
      <header className="kitchen-hero">
        <div className="chef">
          <img
            src={getPokemonImage(CHEF)}
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
                    style={
                      { '--c': FLAVOR_INFO[flavor].color } as CSSProperties
                    }
                  >
                    {FLAVOR_INFO[flavor].label} → <b>{STATS[stat].label}</b>
                  </li>
                )
              }
            )}
          </ul>
          <p className="kitchen-found">
            Đã khám phá{' '}
            <b>{`${menu?.found ?? 0}/${menu?.dishes.filter((d) => d.secret).length ?? 8}`}</b>{' '}
            món bí ẩn
          </p>
        </div>
      </header>

      <div className="kitchen-tabs" role="tablist" aria-label="Bếp">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'menu'}
          aria-controls="kitchen-menu"
          onClick={() => setTab('menu')}
        >
          Thực đơn
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'pot'}
          aria-controls="kitchen-pot"
          onClick={() => setTab('pot')}
        >
          Tự pha chế
        </button>
      </div>

      {note && (
        <p className="kitchen-note" role="status">
          {note}
        </p>
      )}
      {guest && (
        <p className="kitchen-guest">
          Nguyên liệu nằm trong túi đồ của tài khoản. {signIn}
        </p>
      )}

      {tab === 'menu' ? (
        <section id="kitchen-menu" role="tabpanel" aria-label="Thực đơn">
          <div
            className="menu-filter"
            role="group"
            aria-label="Lọc theo chỉ số"
          >
            <button
              type="button"
              aria-pressed={!filter}
              onClick={() => setFilter('')}
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
                  onClick={() => setFilter(stat)}
                  style={{ '--c': STATS[stat].color } as CSSProperties}
                >
                  {STATS[stat].label}
                </button>
              ))}
          </div>
          <ol className="menu-list">
            {shown.map((dish) => (
              <MenuCard
                key={dish.id}
                dish={dish}
                bag={bag}
                cooked={dishes[dish.id] ?? 0}
                guest={guest}
                busy={!!cooking}
                onCook={() => cook(dish.id, dish.ingredients ?? [])}
                onTry={() => setTab('pot')}
              />
            ))}
          </ol>
        </section>
      ) : (
        <section id="kitchen-pot" role="tabpanel" aria-label="Tự pha chế">
          <Pot
            // its shelf is sorted once the bag is in
            key={bagOrNull ? 'bag' : 'waiting'}
            bag={bag}
            pot={pot}
            attempts={menu?.attempts ?? []}
            onAdd={(id) =>
              setPot((current) =>
                current.length < 4 ? [...current, id] : current
              )
            }
            onRemove={(index) =>
              setPot((current) => current.filter((_, i) => i !== index))
            }
            onClear={() => setPot([])}
            action={
              guest ? (
                signIn
              ) : (
                <button
                  type="button"
                  className="pot-cook"
                  disabled={pot.length < 2 || !!cooking}
                  onClick={() => cook(null, pot)}
                >
                  {potKnown ? `Nấu ${potKnown.name}` : 'Nấu thử!'}
                </button>
              )
            }
          />
        </section>
      )}

      {cooking && (
        <CookFx
          pot={cooking.pot}
          result={cooking.result}
          glow={FLAVOR_INFO[strongest].color}
          onClose={() => setCooking(null)}
        />
      )}
    </KitchenStyle>
  )
}
