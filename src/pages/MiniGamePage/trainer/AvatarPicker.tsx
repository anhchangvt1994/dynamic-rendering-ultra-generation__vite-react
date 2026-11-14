import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { AVATARS, avatarUnlocked } from '../avatars.mjs'
import AvatarArt from './AvatarArt'
import { MAX_FILE_BYTES, encodeAvatar, squareCrop } from './avatarImage.mjs'

type Trainer = { level: number; avatar: string; owned: number; team: string[] }
type Unlock = { type: string; level?: number; wins?: number; owned?: number; size?: number }

const need = (u: Unlock) =>
  u.type === 'level'
    ? `Cần Lv ${u.level}`
    : u.type === 'wins'
      ? `Thắng ${u.wins} ván mini-game`
      : u.type === 'owned'
        ? `Cần ${u.owned} Pokémon`
        : u.type === 'team'
          ? `Đội hình đủ ${u.size} Pokémon`
          : ''
// the ring colour says how an avatar is earned
const RING: Record<string, string> = { free: '#cfe3ff', level: '#ffcf5a', wins: '#ff7a6b', owned: '#5fe3b4', team: '#c79bff' }
const KIND: Record<string, string> = { free: 'Có sẵn', level: 'Cột mốc level', wins: 'Thành tích', owned: 'Sưu tầm', team: 'Đội hình', custom: 'Tự thiết kế' }
const VIEW = 248

/** Crop a chosen photo into a round avatar: drag to move, slider to zoom. */
function Cropper({ file, onCancel, onUse }: { file: File; onCancel: () => void; onUse: (image: string) => Promise<void> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const pts = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d: number; zoom: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ zoom: 1, cx: 0.5, cy: 0.5 })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => {
      if (!live) return
      img.current = el
      setReady(true)
    }
    el.onerror = () => live && setError('Không đọc được ảnh này. Hãy chọn ảnh JPG, PNG hoặc WebP.')
    el.src = url
    return () => {
      live = false
      URL.revokeObjectURL(url)
    }
  }, [file])

  const crop = () => {
    const el = img.current!
    return squareCrop({ w: el.naturalWidth, h: el.naturalHeight, ...view })
  }
  useEffect(() => {
    const c = canvas.current
    if (!ready || !c) return
    const k = crop()
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img.current!, k.sx, k.sy, k.side, k.side, 0, 0, c.width, c.height)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, view])

  // keep the stored focus equal to the crop actually shown, so dragging never stalls at an edge
  const settle = (v: { zoom: number; cx: number; cy: number }) => {
    const el = img.current
    if (!el) return v
    const w = el.naturalWidth
    const h = el.naturalHeight
    const k = squareCrop({ w, h, ...v })
    return { zoom: v.zoom, cx: (k.sx + k.side / 2) / w, cy: (k.sy + k.side / 2) / h }
  }
  const zoomTo = (z: number) => setView((v) => settle({ ...v, zoom: Math.min(4, Math.max(1, z)) }))
  const pan = (dxSrc: number, dySrc: number) => {
    const el = img.current
    if (!el) return
    setView((v) => settle({ ...v, cx: v.cx + dxSrc / el.naturalWidth, cy: v.cy + dySrc / el.naturalHeight }))
  }
  const down = (e: PointerEvent) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom }
    }
    drag.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent) => {
    if (!img.current || !pts.current.has(e.pointerId)) return
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.current.size === 2 && pinch.current) {
      const [a, b] = [...pts.current.values()]
      zoomTo((pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.current.d)
      return
    }
    const d = drag.current
    if (!d) return
    const scale = crop().side / VIEW
    drag.current = { x: e.clientX, y: e.clientY }
    pan(-(e.clientX - d.x) * scale, -(e.clientY - d.y) * scale)
  }
  const up = (e: PointerEvent) => {
    pts.current.delete(e.pointerId)
    pinch.current = null
    const rest = [...pts.current.values()][0]
    drag.current = rest ? { ...rest } : null
  }
  const key = (e: KeyboardEvent) => {
    const step = crop().side * 0.05
    const map: Record<string, () => void> = {
      ArrowLeft: () => pan(-step, 0),
      ArrowRight: () => pan(step, 0),
      ArrowUp: () => pan(0, -step),
      ArrowDown: () => pan(0, step),
      '+': () => zoomTo(view.zoom + 0.2),
      '=': () => zoomTo(view.zoom + 0.2),
      '-': () => zoomTo(view.zoom - 0.2),
    }
    if (!map[e.key]) return
    e.preventDefault()
    map[e.key]()
  }
  // the wheel zooms; it has to be a non-passive listener to stop the sheet from scrolling
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {})
  wheelRef.current = (e) => {
    e.preventDefault()
    zoomTo(view.zoom * Math.exp(-e.deltaY * 0.0015))
  }
  useEffect(() => {
    const el = box.current
    if (!el) return
    const fn = (e: WheelEvent) => wheelRef.current(e)
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [])
  const use = async () => {
    if (!img.current) return
    setBusy(true)
    setError(null)
    try {
      await onUse(encodeAvatar(img.current, 0, crop()))
    } catch (e: any) {
      setError(e?.message ?? 'Không lưu được ảnh.')
      setBusy(false)
    }
  }

  return (
    <div className="tr-crop">
      <div
        className="tr-crop-view"
        ref={box}
        tabIndex={0}
        role="group"
        aria-label="Khung ảnh: dùng phím mũi tên để dời, phím cộng trừ để phóng to"
        data-ready={ready || undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <canvas ref={canvas} width={VIEW * 2} height={VIEW * 2} />
        <i className="tr-crop-grid" />
      </div>
      <p className="mg-sub">Kéo ảnh để dời khung. Cuộn chuột, chụm hai ngón hoặc kéo thanh trượt để phóng to.</p>
      <label className="tr-zoom">
        <span>Thu</span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={view.zoom}
          disabled={!ready}
          aria-label="Phóng to"
          onChange={(e) => zoomTo(Number(e.target.value))}
        />
        <span>Phóng</span>
      </label>
      {error && (
        <p className="mg-error" role="alert">
          {error}
        </p>
      )}
      <div className="tr-crop-actions">
        <button type="button" className="tr-ghost" onClick={() => setView({ zoom: 1, cx: 0.5, cy: 0.5 })} disabled={!ready || busy}>
          Đặt lại
        </button>
        <button type="button" className="tr-ghost" onClick={onCancel} disabled={busy}>
          Chọn ảnh khác
        </button>
        <button type="button" className="tr-use" onClick={use} disabled={!ready || busy}>
          {busy ? 'Đang lưu…' : 'Dùng ảnh này'}
        </button>
      </div>
    </div>
  )
}

/** The trainer hall: a stage for the avatar on show, a wall of badges, and the player's own photo. */
export default function AvatarPicker({
  trainer,
  onPick,
  onUpload,
  loadImage,
  onDone,
  wins,
}: {
  wins: number
  trainer: Trainer
  onPick: (id: string) => Promise<void>
  onUpload: (image: string) => Promise<void>
  loadImage: () => Promise<string | null>
  onDone: () => void
}) {
  const [shown, setShown] = useState(trainer.avatar)
  const [custom, setCustom] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const state = { level: trainer.level, wins, owned: trainer.owned, team: trainer.team.length }

  useEffect(() => {
    let live = true
    loadImage().then(
      (image) => live && setCustom(image),
      () => {}
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const entry = AVATARS.find((a) => a.id === shown)
  const open = shown === 'custom' ? !!custom : entry ? avatarUnlocked(entry, state) : false
  const name = shown === 'custom' ? 'Ảnh của bạn' : (entry?.name ?? '')
  const ring = shown === 'custom' ? '#ff8fd0' : RING[entry?.unlock.type ?? 'free']

  const tilt = (e: PointerEvent) => {
    const el = stage.current
    if (!el || e.pointerType === 'touch') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--rx', `${((0.5 - y) * 9).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
  }
  const untilt = () => {
    const el = stage.current
    el?.style.setProperty('--rx', '0deg')
    el?.style.setProperty('--ry', '0deg')
    el?.style.setProperty('--mx', '50%')
  }
  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone()
    } catch (e: any) {
      setError(e?.message ?? 'Không đổi được avatar.')
      setBusy(false)
    }
  }
  const choose = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_FILE_BYTES) return setError('Ảnh lớn hơn 12 MB, hãy chọn ảnh nhỏ hơn.')
    if (!f.type.startsWith('image/')) return setError('Hãy chọn một tệp ảnh.')
    setError(null)
    setFile(f)
  }

  if (file)
    return (
      <Cropper
        file={file}
        onCancel={() => setFile(null)}
        onUse={async (image) => {
          await onUpload(image)
          setCustom(image)
          onDone()
        }}
      />
    )

  return (
    <div className="tr-hall">
      <div
        className="tr-stage"
        ref={stage}
        data-locked={!open || undefined}
        style={{ ['--ring' as string]: ring }}
        onPointerMove={tilt}
        onPointerLeave={untilt}
      >
        <i className="tr-rays" aria-hidden="true" />
        <i className="tr-foil" aria-hidden="true" />
        <div className="tr-medal" key={shown}>
          <i className="tr-ball" aria-hidden="true" />
          <i className="tr-flash" aria-hidden="true" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <i key={k} className="tr-mote" style={{ ['--k' as string]: k }} aria-hidden="true" />
          ))}
          <span className="tr-portrait">
            <AvatarArt id={shown} image={custom} size={100} locked={!open} />
          </span>
          {!open && <span className="tr-stamp">Chưa mở</span>}
        </div>
        <div className="tr-meta">
          <small className="tr-kind">{KIND[shown === 'custom' ? 'custom' : (entry?.unlock.type ?? 'free')]}</small>
          <b className="tr-name">{name}</b>
          <small className="tr-how">
            {shown === 'custom'
              ? 'Ảnh bạn tải lên từ máy'
              : open
                ? entry?.unlock.type === 'free'
                  ? 'Có sẵn cho mọi trainer'
                  : 'Bạn đã mở khóa'
                : need(entry!.unlock as Unlock)}
          </small>
          {trainer.avatar === shown ? (
            <span className="tr-now">Đang dùng</span>
          ) : (
            <button type="button" className="tr-use" disabled={busy || !open} onClick={() => run(() => onPick(shown))}>
              {busy ? 'Đang đổi…' : open ? 'Dùng avatar này' : 'Chưa mở khóa'}
            </button>
          )}
        </div>
      </div>

      <ul className="tr-wall">
        <li>
          <button
            type="button"
            className="tr-tile tr-tile-up"
            disabled={busy}
            onClick={() => input.current?.click()}
            aria-label="Tải ảnh từ máy lên"
          >
            <span className="tr-plus" aria-hidden="true">+</span>
            <span>Ảnh của bạn</span>
          </button>
        </li>
        {custom && (
          <li>
            <button
              type="button"
              className="tr-tile"
              style={{ ['--ring' as string]: '#ff8fd0' }}
              aria-pressed={shown === 'custom'}
              onClick={() => setShown('custom')}
            >
              <AvatarArt id="custom" image={custom} size={64} />
              <span>Ảnh đã tải</span>
            </button>
          </li>
        )}
        {AVATARS.map((a, i) => {
          const ok = avatarUnlocked(a, state)
          return (
            <li key={a.id} style={{ ['--n' as string]: i }}>
              <button
                type="button"
                className="tr-tile"
                style={{ ['--ring' as string]: RING[a.unlock.type] }}
                aria-pressed={shown === a.id}
                data-locked={!ok || undefined}
                data-mine={trainer.avatar === a.id || undefined}
                onClick={() => setShown(a.id)}
              >
                <AvatarArt id={a.id} size={64} locked={!ok} />
                {!ok && <i className="tr-lock" aria-label="Chưa mở khóa" />}
                <span>{a.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <input ref={input} type="file" accept="image/*" hidden onChange={choose} />
      {error && (
        <p className="mg-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
