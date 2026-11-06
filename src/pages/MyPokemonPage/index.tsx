import { useEffect, useState } from 'react'
import { useAccount } from 'app/supabase/account'
import { pokemonLabel } from 'components/pokemon-page/format.mjs'
import { modeFor } from 'pages/QuizPage/engine/mode'
import { useIndividualList } from 'pages/BagPage/individuals/individualStore'
import {
  MY_POKEMON_PATH,
  OWNED_COLLECTION_PATH,
  findIndividual,
  myPokemonPath,
} from './paths.mjs'
import Chevron from './room/Chevron'
import Room from './room/Room'
import { MyPokemonStyle } from './styles'

// species names come from the shard catalog, loaded when this page opens
function useSpeciesNames() {
  const [names, setNames] = useState<Record<number, string>>({})
  useEffect(() => {
    let live = true
    import('pages/QuizPage/shards/catalog.json').then(({ default: data }) => {
      if (!live) return
      const map: Record<number, string> = {}
      for (const s of data.species) map[s.id] = pokemonLabel(s.name)
      setNames(map)
    })
    return () => {
      live = false
    }
  }, [])
  return (id: number) => names[id] ?? `#${id}`
}

/**
 * Pokémon của tôi: every individual the player got by trading amber, and
 * one page per individual. Private to the player, so never indexed.
 */
export default function MyPokemonPage() {
  setSeoTag({
    title: 'Pokémon của tôi | Pokédex',
    description: 'Những Pokémon của riêng bạn, nhận được khi đổi hổ phách.',
    robots: 'noindex, nofollow',
  })
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const suppliedReturn = location.state?.returnTo
  const returnTo =
    typeof suppliedReturn === 'string' &&
    suppliedReturn.startsWith('/?') &&
    new URLSearchParams(suppliedReturn.slice(2)).get('view') === 'caught'
      ? suppliedReturn
      : OWNED_COLLECTION_PATH
  useEffect(() => {
    if (!id) navigate(OWNED_COLLECTION_PATH, { replace: true })
  }, [id, navigate])
  const account = useAccount()
  const mode = modeFor(account.status)
  const listed = mode === 'server' || mode === 'local'
  const { items, loading, error, retry } = useIndividualList(listed, null)
  const nameOf = useSpeciesNames()

  let body
  let room = false
  if (mode === 'guest')
    body = (
      <div className="mp-note">
        <span className="mp-note-icon" aria-hidden="true">
          🔒
        </span>
        <strong>Đăng nhập để có Pokémon của riêng bạn</strong>
        <p>Pokémon nhận được khi đổi hổ phách được lưu trên tài khoản.</p>
        {account.status !== 'off' && (
          <LinkCustom
            className="mp-btn mp-primary"
            to="/dang-nhap"
            state={{ from: myPokemonPath(id) }}
          >
            Đăng nhập
          </LinkCustom>
        )}
      </div>
    )
  else if (error)
    body = (
      <div className="mp-note" role="alert">
        <span className="mp-note-icon" aria-hidden="true">
          ⚠️
        </span>
        <p>Không tải được danh sách Pokémon của bạn.</p>
        <button type="button" className="mp-btn" onClick={retry}>
          Thử lại
        </button>
      </div>
    )
  else if (!items || mode === 'checking') {
    room = Boolean(id)
    body = id ? (
      <div className="mp-room-skel" role="status" aria-label="Đang tải phòng">
        <span className="mp-skel-head">
          <span className="mp-skel mp-skel-back" />
          <span className="mp-skel mp-skel-name" />
        </span>
        <span className="mp-skel-needs">
          <span className="mp-skel" />
          <span className="mp-skel" />
          <span className="mp-skel" />
        </span>
        <span className="mp-skel mp-skel-disc" />
        <span className="mp-skel-dock">
          <span className="mp-skel" />
          <span className="mp-skel" />
          <span className="mp-skel" />
          <span className="mp-skel" />
        </span>
      </div>
    ) : (
      <p className="mp-note" role="status">
        {loading || mode === 'checking' ? 'Đang tải…' : ''}
      </p>
    )
  } else if (id) {
    const item = findIndividual(items, id)
    room = Boolean(item)
    body = item ? (
      <Room
        key={`${account.user?.id ?? mode}:${item.id}`}
        individual={item}
        species={nameOf(item.speciesId)}
        siblings={items.filter(
          (candidate) => candidate.speciesId === item.speciesId
        )}
        returnTo={returnTo}
        returnIndex={location.state?.returnIndex}
        back={
          <LinkCustom
            className="rm-back"
            to={returnTo}
            aria-label="Về Bộ sưu tập"
            onClick={(event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              const index = location.state?.returnIndex
              const current = window.history.state?.idx
              if (
                Number.isInteger(index) &&
                Number.isInteger(current) &&
                index >= 0 &&
                index < current
              ) {
                event.preventDefault()
                navigate(index - current)
              }
            }}
          >
            <Chevron size={20} />
            <span className="rm-back-text">Bộ sưu tập</span>
          </LinkCustom>
        }
      />
    ) : (
      <div className="mp-note">
        <span className="mp-note-icon" aria-hidden="true">
          🔍
        </span>
        <p>Không tìm thấy Pokémon này trong tài khoản của bạn.</p>
        <LinkCustom className="mp-btn" to={MY_POKEMON_PATH}>
          Về danh sách
        </LinkCustom>
      </div>
    )
  } else body = <p role="status">Đang mở Bộ sưu tập…</p>

  return (
    <MyPokemonStyle data-tone="dark" data-room={room || undefined}>
      {body}
    </MyPokemonStyle>
  )
}
