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

  float w[3];
  float sum = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 d = lab.yz - uSource[i].yz;
    w[i] = i < uCount ? exp(-dot(d, d) / SPREAD) : 0.0;
    sum += w[i];
  }
  vec3 out_ = lab;
  float main_ = 0.0;
  if (sum > 1e-6) {
    for (int i = 0; i < 3; i++) {
      float k = w[i] / sum * free;
      out_ += k * (uTarget[i] - uSource[i]);
    }
    main_ = w[0] / sum;
  }
  if (uEffect == 1) {
    vec3 metal = vec3(0.5 + (out_.x - 0.5) * 1.35, out_.yz * 0.6);
    out_ = mix(out_, metal, free);
  }

  if (uHasMarks > 0.5) {
    vec4 flow = texture2D(uFlow, cellUv(uv, uFrame, uFlowCols, vec2(uTile), uFlowSize));
    vec4 mark = texture2D(uMarks, flow.rg);
    float cover = mark.a * flow.b * main_ * free;
    if (cover > 0.001) {
      vec3 tone = mark.rgb / max(mark.a, 1e-4);
      tone /= max(tone.r + tone.g + tone.b, 1e-4);
      vec3 ink = tone.r * uDark + tone.g * uLight + tone.b * uAccent;
      // keep the body's shading under the mark
      ink.x = clamp(ink.x + (out_.x - uTarget[0].x), 0.0, 1.0);
      out_ = mix(out_, ink, cover);
    }
  }

  if (uMood == 1) out_.yz *= 0.35;
  if (uMood == 2) out_ = turn(vec3(out_.x, out_.yz * 1.6), -30.0);

  gl_FragColor = vec4(srgb(out_) * alpha, alpha);
}
`
