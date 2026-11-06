/**
 * The room's three.js scene: one quad, one shader (shader.ts). The only
 * module that imports three, so three stays in this lazy chunk.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  Mesh,
  NoBlending,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Rig } from './rig'
import { FRAGMENT, VERTEX } from './shader'

export type Uniforms = {
  count: number
  source: Float32Array
  target: Float32Array
  effect: number
  dark: Float32Array
  light: Float32Array
  accent: Float32Array
}

export type Scene3 = {
  setFrame(i: number): void
  setMood(mood: string | undefined): void
  setFlip(back: boolean): void
  setSize(width: number, height: number, ratio: number): void
  render(): void
  /** frees the scene; `keepContext` when the context just came back */
  dispose(keepContext?: boolean): void
}

const MOODS: Record<string, number> = { sad: 1, angry: 2 }

const texture = (image: TexImageSource | HTMLCanvasElement) => {
  const t =
    image instanceof HTMLCanvasElement
      ? new CanvasTexture(image)
      : new Texture(image as ImageBitmap)
  t.flipY = false
  t.colorSpace = NoColorSpace
  t.generateMipmaps = false
  t.minFilter = LinearFilter
  t.magFilter = LinearFilter
  t.wrapS = ClampToEdgeWrapping
  t.wrapT = ClampToEdgeWrapping
  t.needsUpdate = true
  return t
}

const vec3s = (a: Float32Array) =>
  [0, 1, 2].map((i) => new Vector3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]))

/** The scene on `canvas`; throws when WebGL is not there. */
export function startScene(
  canvas: HTMLCanvasElement,
  rig: Rig,
  uniforms: Uniforms,
  marksCanvas: HTMLCanvasElement | null
): Scene3 {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    powerPreference: 'low-power',
  })
  renderer.setClearColor(0x000000, 0)
  const { json } = rig
  const sheet = texture(rig.sheet)
  const flow = texture(rig.flow)
  const marks = marksCanvas ? texture(marksCanvas) : null
  const [dark, light, accent] = [
    uniforms.dark,
    uniforms.light,
    uniforms.accent,
  ].map((v) => new Vector3(v[0], v[1], v[2]))
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      uSheet: { value: sheet },
      uSheetSize: { value: new Vector2(rig.sheet.width, rig.sheet.height) },
      uCell: { value: new Vector2(json.frame.w, json.frame.h) },
      uCols: { value: json.sheet.cols },
      uFrame: { value: 0 },
      uFlow: { value: flow },
      uFlowSize: { value: new Vector2(rig.flow.width, rig.flow.height) },
      uFlowCols: { value: json.flow.cols },
      uTile: { value: json.flow.tile },
      uMarks: { value: marks ?? flow },
      uHasMarks: { value: marks ? 1 : 0 },
      uCount: { value: uniforms.count },
      uSource: { value: vec3s(uniforms.source) },
      uTarget: { value: vec3s(uniforms.target) },
      uEffect: { value: uniforms.effect },
      uDark: { value: dark },
      uLight: { value: light },
      uAccent: { value: accent },
      uLock: { value: new Vector2(json.lock.ink, json.lock.light) },
      uMood: { value: 0 },
      uFlip: { value: 0 },
      uFit: { value: new Vector2(1, 1) },
    },
  })
  const geometry = new PlaneGeometry(2, 2)
  const scene = new Scene()
  scene.add(new Mesh(geometry, material))
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const u = material.uniforms
  return {
    setFrame: (i) => {
      u.uFrame.value = Math.max(0, Math.min(json.frames - 1, i))
    },
    setMood: (mood) => {
      u.uMood.value = MOODS[mood ?? ''] ?? 0
    },
    setFlip: (back) => {
      u.uFlip.value = back ? 1 : 0
    },
    setSize: (width, height, ratio) => {
      renderer.setPixelRatio(ratio)
      renderer.setSize(width, height, false)
      // the frame contained in the box, as an <img> would be
      const box = width / height
      const frame = json.frame.w / json.frame.h
      u.uFit.value.set(
        frame < box ? frame / box : 1,
        frame > box ? box / frame : 1
      )
    },
    render: () => renderer.render(scene, camera),
    dispose: (keepContext = false) => {
      geometry.dispose()
      material.dispose()
      sheet.dispose()
      flow.dispose()
      marks?.dispose()
      renderer.dispose()
      if (!keepContext) renderer.forceContextLoss()
    },
  }
}
