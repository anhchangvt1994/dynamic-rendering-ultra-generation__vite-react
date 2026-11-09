/**
 * The room's fragment shader: the current sheet frame, its colour regions
 * swapped for the individual's palette in OKLab (shading kept, ink and
 * highlights locked), its marks carried from frame 0 along the flow, then
 * mood and turning away. The texture holds premultiplied sRGB; so does the
 * output.
 */
export const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uSheet;
uniform vec2 uSheetSize;   // px
uniform vec2 uCell;        // px
uniform float uCols;
uniform float uFrame;

uniform sampler2D uFlow;
uniform vec2 uFlowSize;    // px
uniform float uFlowCols;
uniform float uTile;

uniform sampler2D uMarks;
uniform float uHasMarks;

uniform int uCount;
uniform vec3 uSource[3];
uniform vec3 uTarget[3];
uniform int uEffect;       // 0 none, 1 metal, 2 invert
uniform vec3 uDark;
uniform vec3 uLight;
uniform vec3 uAccent;
uniform vec2 uLock;        // ink, light

uniform int uMood;         // 0 none, 1 sad, 2 angry
uniform float uFlip;
uniform vec2 uFit;         // the frame's share of the canvas, per axis

const float LIGHT_CHROMA = 0.04;
const float SPREAD = 0.0016;
const float EYE_DARK = 0.72;  // an eye's iris is darker than this (luma)
const float EYE_REACH = 0.06;  // how far from the iris its highlight sits (of the frame)

vec3 toLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 toSrgb(vec3 c) {
  c = max(c, 0.0);
  return mix(12.92 * c, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 oklab(vec3 rgb) {
  vec3 c = toLinear(rgb);
  vec3 lms = vec3(
    dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)),
    dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)),
    dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005)));
  lms = sign(lms) * pow(abs(lms), vec3(1.0 / 3.0));
  return vec3(
    dot(lms, vec3(0.2104542553, 0.793617785, -0.0040720468)),
    dot(lms, vec3(1.9779984951, -2.428592205, 0.4505937099)),
    dot(lms, vec3(0.0259040371, 0.7827717662, -0.808675766)));
}
vec3 srgb(vec3 lab) {
  vec3 lms = vec3(
    lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
    lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
    lab.x - 0.0894841775 * lab.y - 1.291485548 * lab.z);
  lms = lms * lms * lms;
  vec3 c = vec3(
    dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
    dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
    dot(lms, vec3(-0.0041960863, -0.7034186147, 1.707614701)));
  return clamp(toSrgb(c), 0.0, 1.0);
}
vec3 turn(vec3 lab, float deg) {
  float r = radians(deg);
  float c = cos(r);
  float s = sin(r);
  return vec3(lab.x, lab.y * c - lab.z * s, lab.y * s + lab.z * c);
}

// a cell of a grid texture, its border texels clamped so nothing bleeds in
vec2 cellUv(vec2 uv, float index, float cols, vec2 cell, vec2 size) {
  vec2 at = vec2(mod(index, cols), floor(index / cols)) * cell;
  vec2 px = clamp(uv * cell, vec2(0.5), cell - 0.5);
  return (at + px) / size;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// the lightness of the sprite at uv; outside the body, the fallback
float reliefAt(vec2 uv, float fallback) {
  vec4 t = texture2D(uSheet, cellUv(uv, uFrame, uCols, uCell, uSheetSize));
  return t.a > 0.5 ? dot(t.rgb / t.a, vec3(0.299, 0.587, 0.114)) : fallback;
}

// a white catch-light dot of the sprite at uv
float glintAt(vec2 uv) {
  vec4 t = texture2D(uSheet, cellUv(uv, uFrame, uCols, uCell, uSheetSize));
  vec3 c = t.rgb / max(t.a, 1e-3);
  float hi = max(c.r, max(c.g, c.b));
  float lo = min(c.r, min(c.g, c.b));
  return t.a > 0.5 && lo > 0.86 && hi - lo < 0.1 ? 1.0 : 0.0;
}
// a dark pixel with a catch-light close by is an eye's iris: a body never has
// a white dot beside a dark patch, an eye always does
float eyeAt(vec2 uv) {
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 dir = vec2(cos(a), sin(a));
    for (int j = 1; j <= 4; j++)
      if (glintAt(uv + dir * EYE_REACH * float(j) / 4.0) > 0.5) return 1.0;
  }
  return 0.0;
}

void main() {
  vec2 uv = (vUv - 0.5) / uFit + 0.5;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
    gl_FragColor = vec4(0.0);
    return;
  }
  uv.y = 1.0 - uv.y;
  if (uFlip > 0.5) uv.x = 1.0 - uv.x;

  vec4 texel = texture2D(uSheet, cellUv(uv, uFrame, uCols, uCell, uSheetSize));
  float alpha = texel.a;
  if (alpha < 0.002) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 lab = oklab(texel.rgb / alpha);
  float chroma = length(lab.yz);

  float lock = max(
    1.0 - smoothstep(uLock.x - 0.03, uLock.x + 0.03, lab.x),
    smoothstep(uLock.y - 0.03, uLock.y + 0.03, lab.x) *
      (1.0 - smoothstep(LIGHT_CHROMA - 0.02, LIGHT_CHROMA + 0.02, chroma)));
  float free = 1.0 - lock;
  if (free > 0.01 && dot(texel.rgb / alpha, vec3(0.299, 0.587, 0.114)) < EYE_DARK && chroma < 0.14 && eyeAt(uv) > 0.5)
    free = 0.0;

  float w[3];
  float sum = 0.0;
  float top = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 d = lab.yz - uSource[i].yz;
    // a wide skirt, so the anti-aliased fringe of a claw is taken in too
    float d2 = dot(d, d);
    w[i] = i < uCount ? exp(-d2 / SPREAD) + 1e-5 * exp(-d2 / (SPREAD * 3.0)) : 0.0;
    sum += w[i];
    top = max(top, w[i]);
  }
  vec3 out_ = lab;
  // the lightness this pixel's own region is recoloured to
  float base = uTarget[0].x;
  if (sum > 1e-6) {
    base = 0.0;
    for (int i = 0; i < 3; i++) base += w[i] / sum * uTarget[i].x;
  }
  if (sum > 1e-6) {
    for (int i = 0; i < 3; i++) {
      float k = w[i] / sum * free;
      out_ += k * (uTarget[i] - uSource[i]);
    }
  }
  if (uEffect == 1) {
    vec3 metal = vec3(0.5 + (out_.x - 0.5) * 1.35, out_.yz * 0.6);
    out_ = mix(out_, metal, free);
  }

  if (uHasMarks > 0.5) {
    // drawn whole for this frame where the body took each mark (track.mjs),
    // read in place: a per-pixel lookup through the flow tears a mark on a
    // fast tail (Pikachu); a whole shape can not tear
    // the body's relief (its lightness) bends the mark a little, so it
    // follows the form instead of lying flat on top; the edge is feathered
    // by a few taps so no pixel-sharp sticker rim is left
    float c0 = dot(texel.rgb / alpha, vec3(0.299, 0.587, 0.114));
    vec2 e = 1.5 / uCell;
    float hx = reliefAt(uv + vec2(e.x, 0.0), c0) - reliefAt(uv - vec2(e.x, 0.0), c0);
    float hy = reliefAt(uv + vec2(0.0, e.y), c0) - reliefAt(uv - vec2(0.0, e.y), c0);
    vec2 bend = vec2(hx, hy);
    float bl = length(bend);
    bend *= min(bl, 0.16) / max(bl, 1e-4) * 0.03;
    vec2 muv = uv - bend;
    float f = 0.9 / 512.0;
    vec4 mark = vec4(0.0);
    vec3 markRgb = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      vec2 o = i == 0 ? vec2(0.0) : i == 1 ? vec2(f, 0.0) : i == 2 ? vec2(-f, 0.0) : i == 3 ? vec2(0.0, f) : vec2(0.0, -f);
      vec4 s = texture2D(uMarks, muv + o);
      float wgt = i == 0 ? 0.4 : 0.15;
      mark.a += s.a * wgt;
      markRgb += s.rgb * s.a * wgt;
    }
    mark.rgb = markRgb / max(mark.a, 1e-4) * mark.a;
    // how deep inside its shape this pixel is: wide taps of the mark's own
    // alpha. The rim seeps into the skin, the middle stays full, like dye
    float wide = 3.2 / 512.0;
    float ring = 0.0;
    ring += texture2D(uMarks, muv + vec2(wide, 0.0)).a;
    ring += texture2D(uMarks, muv - vec2(wide, 0.0)).a;
    ring += texture2D(uMarks, muv + vec2(0.0, wide)).a;
    ring += texture2D(uMarks, muv - vec2(0.0, wide)).a;
    float inner = smoothstep(0.25, 1.0, ring * 0.25) * smoothstep(0.0, 0.6, mark.a);
    // emboss: the mark's own alpha slope, lit from the upper left
    float em = 1.6 / 512.0;
    float emboss =
      texture2D(uMarks, muv - vec2(em, em)).a - texture2D(uMarks, muv + vec2(em, em)).a;
    // which kind of mark: dark ones (spots, stripes, patches) are pigment,
    // the light one (scar) is scar tissue, the accent ones (stars, flowers,
    // hearts) are dye. Each sits in the skin its own way
    vec3 tone = mark.rgb / max(mark.a, 1e-4);
    tone /= max(tone.r + tone.g + tone.b, 1e-4);
    float pig = tone.r;
    float scr = tone.g;
    // pigment grain: noise (fixed to the mark's own space) erodes the rim
    // unevenly, as dye bleeds into skin, instead of a clean cut-out edge
    float grain = vnoise(muv * 210.0) * 0.65 + vnoise(muv * 540.0) * 0.35;
    float mottle = vnoise(muv * 64.0);
    // pigment has no edge: its alpha is spread over a few pixels and fades
    float spreadA = (mark.a + ring) / 5.0;
    float shape = mix(mark.a, smoothstep(0.08, 0.75, spreadA), pig * 0.85);
    float soft = smoothstep(
      0.18, 0.62, shape + (grain - 0.5) * mix(0.55, 0.8, pig) * (1.0 - inner));
    // a mark is densest inside, thinner toward its rim; pigment also mottles
    float density = mix(0.7, 0.96, inner);
    density = mix(density, (0.55 + 0.45 * inner) * (0.78 + 0.34 * mottle), pig);
    density = mix(density, 0.9, scr);
    // on any region pixel (marks sit on the whole body), fading out where a
    // pixel is near no region at all. Not by the flow's confidence: on a
    // flat, dark body (Gengar) the forward-backward check fails across whole
    // patches and the marks would melt into the skin frame by frame; there
    // the cell's vector (spread from its neighbours) is still close
    float cover = soft * density * free * smoothstep(0.05, 0.3, top);
    if (cover > 0.001) {
      vec3 ink = tone.r * uDark + tone.g * uLight + tone.b * uAccent;
      // a scar stands off the skin under it (deeper on pale, paler on dark),
      // whichever region that is
      float scarL = base >= 0.62 ? base - 0.3 : min(0.95, base + 0.3);
      ink.x = mix(ink.x, scarL, tone.g);
      // the mark only tints the skin: its lightness is the skin's own
      // (shading and sprite detail intact) moved a bounded way toward the
      // mark's, multiplied like dye rather than painted opaque
      float want = clamp(ink.x - base, -0.32, 0.32);
      ink.x = clamp(
        out_.x + want * mix(0.7, 1.0, inner) + 0.08 * (grain - 0.5), 0.0, 1.0);
      // dye takes on the skin's tint; pigment is the skin's own hue, richer
      // (more chroma, a little deeper); a scar is paler in colour than skin
      // a dyed mark is not one flat fill: the weave of the skin shows
      // through, denser toward the middle and varying with the grain
      ink.x += 0.06 * (mottle - 0.5) * tone.b;
      ink.yz = mix(out_.yz, ink.yz, mix(0.6, 0.9, inner) * (0.88 + 0.24 * mottle));
      ink.yz = mix(ink.yz, out_.yz * (1.0 + 0.45 * inner), pig * 0.8);
      ink.yz = mix(ink.yz, out_.yz * 0.55, scr);
      // raised scar tissue catches the light on one side and shades the
      // other; a printed mark only has a slight relief
      ink.x += mix(0.12, 0.34, scr) * emboss;
      cover *= 1.0 - 0.35 * tone.r * (1.0 - pig * 0.6);
      out_ = mix(out_, ink, cover);
    }
    // dye bleeds a little past its shape: a faint accent tint of the skin
    // just outside a star, flower, heart or flake (chroma only, the skin
    // keeps its own lightness and shading)
    float far = 6.5 / 512.0;
    vec4 b1 = texture2D(uMarks, muv + vec2(far, 0.0));
    vec4 b2 = texture2D(uMarks, muv - vec2(far, 0.0));
    vec4 b3 = texture2D(uMarks, muv + vec2(0.0, far));
    vec4 b4 = texture2D(uMarks, muv - vec2(0.0, far));
    float bleedA = (b1.a + b2.a + b3.a + b4.a) * 0.25;
    float bleedB = (b1.b + b2.b + b3.b + b4.b) * 0.25;
    float bleed = bleedB * smoothstep(0.0, 0.5, bleedA) * (1.0 - mark.a);
    out_.yz = mix(out_.yz, uAccent.yz, 0.3 * bleed * free * smoothstep(0.05, 0.3, top));
  }

  if (uMood == 1) out_.yz *= 0.35;
  if (uMood == 2) out_ = turn(vec3(out_.x, out_.yz * 1.6), -30.0);

  gl_FragColor = vec4(srgb(out_) * alpha, alpha);
}
`
