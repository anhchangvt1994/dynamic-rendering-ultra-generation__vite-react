import { refreshBag, useBagStore } from 'pages/BagPage/bagStore'
import KitchenSkeleton from 'components/PageSkeleton/KitchenSkeleton'
import KitchenHeader, { CHEF_LINES, KitchenFilter } from './KitchenHeader'
import {
  FLAVOR_INFO,
  TIERS,
  itemById,
  itemSprite,
} from 'pages/QuizPage/items.mjs'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BatchStepper from './BatchStepper'
import { batchMax, scaleStats } from './batch.mjs'
import CookFx, { COOK_MS } from './CookFx'
import DishArt from './DishArt'
import type { CookResult, DishView, Menu, StatKey } from './engine/types'
import { useKitchenEngine } from './engine/useKitchenEngine'
import { potWithKept } from './kept.mjs'
import { STATS, hintText, recipeKey } from './kitchen.mjs'
import Pot, { potFlavors } from './Pot'
import type { PantryGroup } from './Pot'
import StatChips from './StatChips'
import { KitchenStyle } from './styles'

const ERRORS: Record<string, string> = {
  missing: 'Thiếu nguyên liệu: túi đồ vừa thay đổi, kệ đã được tải lại.',
  bad_pot: 'Nồi cần từ 2 đến 4 nguyên liệu.',
  not_food: 'Có thứ không ăn được trong nồi.',
  unknown_dish: 'Món này chưa có trong thực đơn.',
  sign_in: 'Đăng nhập để vào bếp.',
}

type Count = Record<string, number>
type Tab = 'menu' | 'pot'
const TABS: { id: Tab; label: string }[] = [
  { id: 'menu', label: 'Thực đơn' },
  { id: 'pot', label: 'Tự pha chế' },
]
const other = (tab: Tab): Tab => (tab === 'menu' ? 'pot' : 'menu')
const TAB_KEYS: Record<string, (tab: Tab) => Tab> = {
  ArrowLeft: other,
  ArrowRight: other,
  Home: () => 'menu',
  End: () => 'pot',
}

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
  onCook: (times: number) => void
  onTry: () => void
}) {
  const ready = canCook(dish, bag)
  // a batch: 1 to what the bag makes; the choice shrinks with the bag
  const max = batchMax(dish.ingredients, bag)
  const [chosen, setChosen] = useState(1)
  const count = Math.max(1, Math.min(chosen, max))
  const batch = !guest && max >= 2
  const tier = TIERS[dish.rarity as keyof typeof TIERS]
  // NOTE - A card scrolled away pauses its steam and wobble: the menu's
  // looping art only runs where it can be seen (an attribute, no re-render)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    const card = ref.current
    if (!card || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) =>
        card.toggleAttribute('data-offscreen', !entry.isIntersecting),
      { rootMargin: '120px 0px' }
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [])
  return (
    <li
      ref={ref}
      className="menu-card"
      data-dish={dish.id}
      data-ready={ready || undefined}
      data-secret={!dish.known || undefined}
      style={
        {
          '--tier': tier.color,
          '--dish': STATS[dish.top[0] ?? 'friendship'].color,
        } as CSSProperties
      }
    >
      <header className="menu-head">
        <span className="dish-stage">
          <DishArt
            kind={dish.kind}
            top={dish.top}
            secret={!dish.known}
            size={76}
            steam={ready}
          />
        </span>
        <div className="menu-titles">
          <p className="menu-kicker">
            <span className="stars" aria-hidden="true">
              {'★'.repeat(dish.rarity)}
            </span>
            {dish.known ? tier.label : 'Món bí ẩn'}
            {cooked > 0 && <span className="cooked">· đã nấu {cooked}</span>}
          </p>
          {dish.known ? (
            <h3 className="dish-name">{dish.name}</h3>
          ) : (
            <h3 className="dish-name dish-unknown">
              <span aria-hidden="true">???</span>
              <span className="sr-only">Món bí ẩn</span>
            </h3>
          )}
        </div>
      </header>
      <div className="menu-body">
        {dish.known ? (
          <>
            {dish.stats && <StatChips stats={scaleStats(dish.stats, count)} />}
            <ul className="recipe" aria-label="Công thức">
              {Object.entries(needsOf(dish.ingredients ?? [])).map(
                ([id, n]) => {
                  const have = bag[id] ?? 0
                  return (
                    <li key={id} data-short={have < n || undefined}>
                      <span className="portion-badge" aria-hidden="true">
                        <img
                          src={itemSprite(id)}
                          alt=""
                          width={28}
                          height={28}
                          loading="lazy"
                        />
                        {n > 1 && <i className="portion-n">×{n}</i>}
                      </span>
                      <span className="portion-name">{itemById(id).name}</span>
                      <span className="portion-ticket">
                        <b>
                          {have < n
                            ? `Thiếu ${n - have}`
                            : count > 1
                              ? `Dùng ${n * count}`
                              : `Đủ ${n}`}
                        </b>
                        <span>Túi {have}</span>
                      </span>
                    </li>
                  )
                }
              )}
            </ul>
            <div className="cook-row">
              {batch && (
                <BatchStepper
                  count={count}
                  max={max}
                  disabled={busy}
                  onChange={setChosen}
                />
              )}
              <button
                type="button"
                className="cook"
                disabled={guest || !ready || busy}
                onClick={() => {
                  onCook(count)
                  setChosen(1)
                }}
                aria-label={
                  count > 1
                    ? `Nấu ${count} phần ${dish.name}`
                    : `Nấu ${dish.name}`
                }
              >
                {count > 1 ? `Nấu ×${count}` : 'Nấu'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="menu-hint">{hintText(dish)}</p>
            <button type="button" className="try" onClick={onTry}>
              Tự pha chế
            </button>
          </>
        )}
      </div>
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
  const [tab, setTab] = useState<Tab>('menu')
  // the tab's panel takes the focus once it shows (a secret's "Tự pha chế")
  const focusPanel = useRef(false)
  const panelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!focusPanel.current) return
    focusPanel.current = false
    panelRef.current?.focus()
  }, [tab])
  const [filter, setFilter] = useState<StatKey | ''>('')
  // the pantry's group outlives the pot's tab
  const [group, setGroup] = useState<PantryGroup>('all')
  const [pot, setPot] = useState<string[]>([])
  // the secret hunted in the pot; found, it leaves the list (and the hunt)
  const [targetId, setTargetId] = useState<string | null>(null)
  const targets = (menu?.dishes ?? []).filter((d) => d.secret && !d.known)
  const target = targets.find((d) => d.id === targetId) ?? null
  // hunting a secret puts its right ingredients found so far in the pot
  const hunt = (id: string | null, dishes = menu?.dishes ?? []) => {
    setTargetId(id)
    const kept = dishes.find((d) => d.id === id)?.kept
    if (kept?.length)
      setPot((current) => potWithKept(kept, current, bagOrNull ?? {}))
  }
  // a failed pot hunts again once the menu has its new kept: the target, or
  // the secret it came closest to
  // (a failure gives all back: the bag is as it was before the cook)
  const huntNext = useRef<{ id: string | null } | null>(null)
  // the pot never holds more than the bag: an ingredient spent elsewhere
  // (another tab) leaves it when the bag reloads
  useEffect(() => {
    if (!bagOrNull) return
    setPot((current) => {
      const left: Count = { ...bagOrNull }
      const kept = current.filter((id) => (left[id] = (left[id] ?? 0) - 1) >= 0)
      return kept.length === current.length ? current : kept
    })
  }, [bagOrNull])
  const [cooking, setCooking] = useState<{
    pot: string[]
    result: CookResult | null
  } | null>(null)
  const [note, setNote] = useState('')
  const opener = useRef<HTMLElement | null>(null)
  const [line] = useState(
    () => CHEF_LINES[Math.floor(Math.random() * CHEF_LINES.length)]
  )

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
  // once the menu is back after a failure, with its new kept
  useEffect(() => {
    const next = huntNext.current
    if (!next || !menu) return
    huntNext.current = null
    hunt(next.id, menu.dishes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu])

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

  // a second tap before the dialog shows cooks nothing more
  const cookingNow = useRef(false)
  const cook = (dish: string | null, ingredients: string[], times = 1) => {
    if (!engine || cooking || cookingNow.current) return
    cookingNow.current = true
    // the focus goes back there once the dialog closes
    opener.current = document.activeElement as HTMLElement | null
    setNote('')
    setCooking({ pot: ingredients, result: null })
    const started = performance.now()
    engine
      .cook(dish, dish ? null : ingredients, dish ? times : 1)
      .then(async (result) => {
        // the pot has its moment, however fast the answer
        const rest = COOK_MS - (performance.now() - started)
        if (rest > 0) await new Promise((r) => setTimeout(r, rest))
        setCooking({ pot: ingredients, result })
        if (!dish) setPot([])
        if (result.outcome === 'failed')
          huntNext.current = { id: targetId ?? result.closest }
        refreshBag()
        load()
      })
      .catch((error: Error) => {
        setCooking(null)
        setNote(ERRORS[error.message] ?? 'Bếp đang bận, thử lại sau nhé.')
        refreshBag()
      })
      .finally(() => {
        cookingNow.current = false
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

  if (!menu) return <KitchenSkeleton line={line} note={note} />

  return (
    <KitchenStyle className="kitchen-page">
      <KitchenHeader
        line={line}
        found={menu?.found ?? 0}
        total={menu?.dishes.filter((d) => d.secret).length ?? 8}
      />

      {/* NOTE - Tabs the WAI-ARIA way: one stop for Tab, the arrows (and
          Home/End) move between them and open the one they land on */}
      <div
        className="kitchen-tabs"
        role="tablist"
        aria-label="Bếp"
        onKeyDown={(event) => {
          const to = TAB_KEYS[event.key]?.(tab)
          if (!to) return
          event.preventDefault()
          setTab(to)
          event.currentTarget
            .querySelector<HTMLElement>(`#kitchen-tab-${to}`)
            ?.focus()
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`kitchen-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`kitchen-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
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
        <section
          id="kitchen-menu"
          role="tabpanel"
          aria-labelledby="kitchen-tab-menu"
          tabIndex={-1}
          ref={panelRef}
        >
          <KitchenFilter filter={filter} onFilter={setFilter} />
          <ol className="menu-list">
            {shown.map((dish) => (
              <MenuCard
                key={dish.id}
                dish={dish}
                bag={bag}
                cooked={dishes[dish.id] ?? 0}
                guest={guest}
                busy={!!cooking}
                onCook={(times) => cook(dish.id, dish.ingredients ?? [], times)}
                onTry={() => {
                  hunt(dish.id)
                  focusPanel.current = true
                  setTab('pot')
                }}
              />
            ))}
          </ol>
        </section>
      ) : (
        <section
          id="kitchen-pot"
          role="tabpanel"
          aria-labelledby="kitchen-tab-pot"
          tabIndex={-1}
          ref={panelRef}
        >
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
            known={!!potKnown}
            secret={!!potKnown?.secret}
            group={group}
            onGroup={setGroup}
            target={target}
            targets={targets}
            onTarget={(id) => hunt(id)}
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
          opener={opener.current}
        />
      )}
    </KitchenStyle>
  )
}
