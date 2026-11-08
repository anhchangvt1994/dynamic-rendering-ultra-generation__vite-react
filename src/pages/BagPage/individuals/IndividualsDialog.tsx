import { useState } from 'react'
import { useModal } from 'pages/QuizPage/useModal'
import IndividualArt from './IndividualArt'
import { personalityLine, sizeOf, starLabel, paletteLabel } from './display.mjs'
import { nameError } from './messages.mjs'
import { useIndividualList } from './individualStore'
import { useNaming } from './useIndividuals'
import { DialogStyle } from './styles'
import { myPokemonPath } from 'pages/MyPokemonPage/paths.mjs'
import EvolveBadge from 'pages/MyPokemonPage/evolution/EvolveBadge'

type Props = {
  speciesId: number | null
  name: string
  onClose: () => void
}

const date = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN')
}

function Item({ item, name }: { item: any; name: string }) {
  const rename = useNaming()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(item.nickname ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const personality = personalityLine(item.personality)
  const save = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await rename(item.id, value)
      setEditing(false)
    } catch (e: any) {
      setError(nameError(e?.code ?? e?.message))
    }
    setBusy(false)
  }
  return (
    <li className="ind-item" data-individual={item.id}>
      <IndividualArt speciesId={item.speciesId} name={name} size={72} />
      <EvolveBadge individualId={item.id} />
      <span className="ind-item-main">
        <strong>{item.nickname ?? name}</strong>
        <span>
          {personality.name} · {starLabel(item.potential.stars)}
        </span>
        <span>
          {paletteLabel(item.appearance)} · {sizeOf(item.id).label}
          {date(item.createdAt) ? ` · nhận ${date(item.createdAt)}` : ''}
        </span>
      </span>
      {editing ? (
        <form
          className="ind-field"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <label htmlFor={`nick-${item.id}`}>Biệt danh (để trống để xoá)</label>
          <input
            id={`nick-${item.id}`}
            value={value}
            maxLength={16}
            autoComplete="off"
            onChange={(event) => setValue(event.target.value)}
          />
          <span className="ind-error" role="alert">
            {error}
          </span>
          <span className="ind-actions">
            <button
              type="button"
              className="ind-btn"
              onClick={() => setEditing(false)}
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="ind-btn ind-primary"
              aria-disabled={busy || undefined}
            >
              Lưu
            </button>
          </span>
        </form>
      ) : (
        <span className="ind-item-actions">
          <button
            type="button"
            className="ind-btn"
            data-action="rename"
            onClick={() => {
              setValue(item.nickname ?? '')
              setEditing(true)
            }}
          >
            Đổi tên
          </button>
          <LinkCustom
            className="ind-btn"
            data-action="view"
            to={myPokemonPath(item.id)}
          >
            Xem Pokémon của tôi
          </LinkCustom>
        </span>
      )}
    </li>
  )
}

/** Every individual of one species the player owns. */
export default function IndividualsDialog({ speciesId, name, onClose }: Props) {
  const ref = useModal(speciesId !== null, onClose)
  const { items, loading, error, retry } = useIndividualList(
    speciesId !== null,
    speciesId
  )
  return (
    <DialogStyle
      ref={ref}
      aria-labelledby="inds-title"
      data-dialog="individuals"
    >
      <div className="ind-panel">
        <h2 id="inds-title">Cá thể {name}</h2>
        {error && !items ? (
          <p role="alert">
            Chưa tải được danh sách.{' '}
            <button type="button" className="ind-btn" onClick={retry}>
              Thử lại
            </button>
          </p>
        ) : !items || (loading && !items.length) ? (
          <p aria-busy="true">Đang tải…</p>
        ) : items.length ? (
          <ul className="ind-list">
            {items.map((item) => (
              <Item key={item.id} item={item} name={name} />
            ))}
          </ul>
        ) : (
          <p>Bạn chưa có cá thể {name} nào.</p>
        )}
        <button
          type="button"
          className="ind-btn ind-close"
          onClick={() => ref.current?.close()}
        >
          Đóng
        </button>
      </div>
    </DialogStyle>
  )
}
