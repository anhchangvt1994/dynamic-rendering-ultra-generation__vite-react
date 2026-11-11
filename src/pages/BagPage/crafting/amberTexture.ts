import { useEffect, useState } from 'react'

/**
 * The two surface textures (`lit` on loose pieces, `grain` on finished
 * stones) are feTurbulence + lighting: per-pixel CPU work that used to rerun
 * for every piece of every row that mounted while the shelf scrolled. They
 * depend only on a seed, so each is rendered once into a PNG and every card
 * shares it as a plain <image>.
 */
export type TextureKind = 'lit' | 'grain'

const SPEC: Record<
  TextureKind,
  { size: number; filter: (seed: number) => string }
> = {
  lit: {
    size: 192,
    filter: (seed) => `
<feTurbulence type="fractalNoise" baseFrequency=".014 .02" numOctaves="2" seed="${seed}" result="n"/>
<feSpecularLighting in="n" surfaceScale="2.2" specularConstant=".5" specularExponent="14" lightingColor="#fff6d2" result="spec"><feDistantLight azimuth="235" elevation="46"/></feSpecularLighting>
<feDiffuseLighting in="n" surfaceScale="2.2" diffuseConstant="1" lightingColor="#fff" result="diff"><feDistantLight azimuth="235" elevation="46"/></feDiffuseLighting>
<feColorMatrix in="diff" type="matrix" values="0 0 0 0 .5  0 0 0 0 .24  0 0 0 0 0  -1.5 0 0 0 1.1" result="shade"/>
<feMerge><feMergeNode in="shade"/><feMergeNode in="spec"/></feMerge>`,
  },
  grain: {
    size: 256,
    filter: (seed) => `
<feTurbulence type="fractalNoise" baseFrequency=".5" numOctaves="3" seed="${seed}" result="g"/>
<feDiffuseLighting in="g" surfaceScale="1.6" diffuseConstant="1.1" lightingColor="#fff" result="d"><feDistantLight azimuth="235" elevation="55"/></feDiffuseLighting>
<feColorMatrix in="d" type="matrix" values="0 0 0 0 .42  0 0 0 0 .18  0 0 0 0 0  -1.6 0 0 0 1.15"/>`,
  },
}

const done = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

const bake = (kind: TextureKind, seed: number): Promise<string> => {
  const key = `${kind}:${seed}`
  const known = pending.get(key)
  if (known) return known
  const { size, filter } = SPEC[kind]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"><filter id="f" filterUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" color-interpolation-filters="sRGB">${filter(seed)}</filter><rect width="100" height="100" fill="#000" filter="url(#f)"/></svg>`
  const job = new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        canvas.getContext('2d')!.drawImage(img, 0, 0, size, size)
        const url = canvas.toDataURL('image/png')
        done.set(key, url)
        resolve(url)
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
  pending.set(key, job)
  // a failed bake stays failed: the card just paints without the texture
  job.catch(() => {})
  return job
}

/** The baked texture's data URL, or undefined until it is ready. */
export function useAmberTexture(kind: TextureKind, seed: number) {
  const key = `${kind}:${seed}`
  const [url, setUrl] = useState(() => done.get(key))
  useEffect(() => {
    const ready = done.get(key)
    if (ready) return setUrl(ready)
    setUrl(undefined)
    let live = true
    bake(kind, seed).then(
      (next) => live && setUrl(next),
      () => {}
    )
    return () => {
      live = false
    }
  }, [kind, seed, key])
  return url
}
