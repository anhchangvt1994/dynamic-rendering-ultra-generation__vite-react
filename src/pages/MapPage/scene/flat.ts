import { CanvasTexture, Color, SRGBColorSpace, DataTexture, MeshToonMaterial, NearestFilter, RedFormat, SpriteMaterial } from 'three'

let ramp: DataTexture | null = null
/** A 3-step light ramp: the flat, cel-shaded look of a toy. */
export const toonRamp = () => {
  if (!ramp) {
    ramp = new DataTexture(new Uint8Array([150, 205, 255]), 3, 1, RedFormat)
    ramp.minFilter = ramp.magFilter = NearestFilter
    ramp.needsUpdate = true
  }
  return ramp
}
export const toon = (c: string | Color, extra: Record<string, unknown> = {}) => new MeshToonMaterial({ color: c, gradientMap: toonRamp(), ...extra })

export const INK = '#3b2a52'
export const CANDY = ['#ff7aa8', '#ffd24a', '#5fe3b4', '#7ac8ff', '#c79bff', '#ff9a4a']

/**
 * Depth-tests a sprite against the world, but pulls its depth toward the camera
 * by `uBias` world units (xy untouched). A standing character is hidden by what
 * is truly in front of it, yet its flat quad never sinks into the ground behind.
 */
export function biasDepth(m: SpriteMaterial, uBias: { value: number }, outline = false) {
  const prev = m.onBeforeCompile
  m.userData.uBias = uBias
  m.onBeforeCompile = (s: any, r: any) => {
    prev?.call(m, s, r)
    s.uniforms.uBias = uBias
    s.vertexShader = s.vertexShader
      .replace('void main() {', 'uniform float uBias;\nvoid main() {')
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\n vec4 cp = projectionMatrix * vec4( mvPosition.xy, mvPosition.z + uBias, 1.0 );\n gl_Position.z = cp.z / cp.w * gl_Position.w;'
      )
  }
  const key = outline ? 'biasDepth-outline' : 'biasDepth-plain'
  m.customProgramCacheKey = () => key
  m.needsUpdate = true
}

/** A sprite material that paints the texture's silhouette in one flat colour: the sticker outline. */
export function outlineMaterial(map: CanvasTexture | null, colour = '#ffffff') {
  const m = new SpriteMaterial({ map, transparent: true, depthWrite: false, alphaTest: 0.02 })
  m.userData.uOutline = { value: new Color(colour) }
  m.onBeforeCompile = (s: any) => {
    s.uniforms.uOutline = m.userData.uOutline
    s.fragmentShader = s.fragmentShader
      .replace('void main() {', 'uniform vec3 uOutline;\nvoid main() {')
      .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb = uOutline;')
  }
  return m
}

/** A rounded text pill drawn on a canvas, for names floating over the map. */
export function pillTexture(text: string, { fill = '#ffffff', ink = INK, accent = '#ffd24a', size = 34 }: { fill?: string; ink?: string; accent?: string; size?: number } = {}) {
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  g.font = `800 ${size}px system-ui, sans-serif`
  const w = Math.ceil(g.measureText(text).width) + size * 1.5
  const h = Math.round(size * 1.7)
  c.width = w
  c.height = h
  g.font = `800 ${size}px system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const r = h / 2 - 3
  g.lineWidth = 5
  g.strokeStyle = ink
  g.fillStyle = fill
  g.beginPath()
  g.roundRect(3, 3, w - 6, h - 6, r)
  g.fill()
  g.stroke()
  g.fillStyle = accent
  g.beginPath()
  g.arc(size * 0.7, h / 2, size * 0.26, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = ink
  g.fillText(text, w / 2 + size * 0.3, h / 2 + 1)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return { tex: t, ratio: w / h }
}
