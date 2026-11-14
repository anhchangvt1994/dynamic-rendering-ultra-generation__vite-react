// Camera poses and the flight between them (pure; World.ts moves the camera).
// A pose is where the camera looks (target), its heading (yaw, pitch) and its distance.
import { REGION_R, TRAY } from './layout.mjs'
import { fitDistance } from './framing.mjs'

export const FOV = 40
const lerp = (a, b, u) => a + (b - a) * u
const mix = (a, b, u) => a.map((v, i) => lerp(v, b[i], u))
const turn = (a, b) => {
  const d = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  return a + d
}

export const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)

const T = REGION_R * TRAY

/** The carousel: the active island, whole, in the middle; its neighbours peek in from the sides. */
export function overviewPose(aspect = 1.6) {
  return {
    target: [0, -T * 0.16, 0],
    yaw: 0,
    pitch: -0.36,
    dist: fitDistance({ halfW: T * 1.04, halfH: T * 0.78, fovDeg: FOV, aspect, margin: 1.04 }),
  }
}

/** The whole of one region (land and its sea tray) in one frame; a portrait screen turns the map. */
export function regionPose(aspect = 1.6) {
  // a portrait screen frames the land and lets the sea run off the edges
  const half = aspect < 1 ? REGION_R * 0.92 : REGION_R * TRAY * 0.9
  return {
    target: [0, 0, 0],
    yaw: 0,
    pitch: aspect < 1 ? -0.72 : -0.62,
    dist: fitDistance({ halfW: half, halfH: half * 0.78, fovDeg: FOV, aspect, margin: 1.02 }) * (aspect < 1 ? 0.26 : 0.3),
  }
}

/** Closer in on a point (a town, a character) of the region. */
export function focusPose(point, base, factor = 0.4) {
  return { target: [point[0], point[1] + 1, point[2]], yaw: base.yaw, pitch: base.pitch, dist: base.dist * factor }
}

/** The pose at fraction `u` of a flight; the camera rises mid-way (`bump` × the distance). */
export function flyPose(from, to, u, bump = 0.25) {
  return {
    target: mix(from.target, to.target, u),
    yaw: lerp(from.yaw, turn(from.yaw, to.yaw), u),
    pitch: lerp(from.pitch, to.pitch, u),
    dist: lerp(from.dist, to.dist, u) * (1 + Math.sin(u * Math.PI) * bump),
  }
}
