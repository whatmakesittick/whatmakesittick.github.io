import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { TOES } from './toeFields';
import type { ToeFields } from './toeFields';

export const TOE_ATTRIBUTE = 'toeFrame';

const TOE_LOOK = {
  amplitude: 0.004,
  amplitudeShare: 0.45,
  fadeIn: 0.015,
  strength: 1,
  grooveShade: 0.4,
  grooveHalfWidth: 0.0015,
  probeMinimum: 0.0002,
  probePixels: 0.5,
  bandFromPixels: 1.5,
  bandToPixels: 6,
} as const;

function glsl(value: number): string {
  return value.toFixed(5);
}

function array(values: readonly number[]): string {
  return `float[${values.length}](${values.map(glsl).join(', ')})`;
}

const VERTEX_HEAD = /* glsl */ `
attribute vec2 ${TOE_ATTRIBUTE};
varying vec2 vToe;
`;

const VERTEX_BODY = /* glsl */ `
vToe = ${TOE_ATTRIBUTE};
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uToeEdges[4];
varying vec2 vToe;
const float TOE_WIDTHS[${TOES.widthShares.length}] = ${array(TOES.widthShares)};

float toeHeight(vec2 at, float amplitude, float pixel, out float groove) {
  float height = 0.0;
  float shade = 0.0;
  float grooveWidth = max(${glsl(TOE_LOOK.grooveHalfWidth)}, pixel);
  float reach = max(at.x, 0.0);
  float low = uToeEdges[0] + uToeEdges[1] * reach;
  float high = uToeEdges[2] + uToeEdges[3] * reach;
  float span = max(high - low, 1e-4);
  float edge = high;
  for (int i = 0; i < ${TOES.widthShares.length}; i++) {
    float width = TOE_WIDTHS[i] * span;
    float radius = 0.5 * width;
    float offset = abs(at.y - (edge - radius));
    float lift = min(amplitude, ${glsl(TOE_LOOK.amplitudeShare)} * radius);
    float bulge = (radius * radius + lift * lift) / (2.0 * max(lift, 1e-6));
    float arc = sqrt(max(bulge * bulge - offset * offset, 0.0)) - (bulge - lift);
    float inside = step(offset, radius);
    height += inside * arc;
    shade += inside * (1.0 - smoothstep(0.0, grooveWidth, radius - offset));
    edge -= width;
  }
  float onset = smoothstep(0.0, ${glsl(TOE_LOOK.fadeIn)}, at.x);
  float interior = smoothstep(0.0, grooveWidth, min(at.y - low, high - at.y));
  groove = min(shade, 1.0) * onset * interior;
  return height * onset;
}

vec2 toeSlope(vec2 at, float amplitude, float pixel) {
  float probe = max(${glsl(TOE_LOOK.probeMinimum)}, ${glsl(TOE_LOOK.probePixels)} * pixel);
  float unused;
  float centre = toeHeight(at, amplitude, pixel, unused);
  float ahead = toeHeight(at + vec2(probe, 0.0), amplitude, pixel, unused);
  float aside = toeHeight(at + vec2(0.0, probe), amplitude, pixel, unused);
  return vec2(ahead - centre, aside - centre) / probe;
}

float toePixel() {
  return max(max(fwidth(vToe.x), fwidth(vToe.y)), 1e-6);
}

float toeBandFade(float pixel) {
  float narrowest = ${glsl(Math.min(...TOES.widthShares))} * uToeEdges[2] * 2.0;
  return smoothstep(${glsl(TOE_LOOK.bandFromPixels)}, ${glsl(TOE_LOOK.bandToPixels)}, narrowest / pixel);
}
`;

const FRAGMENT_COLOR = /* glsl */ `
float toePx = toePixel();
float toeFade = toeBandFade(toePx);
float toeGroove;
float toeLift = toeHeight(vToe, ${glsl(TOE_LOOK.amplitude)} * toeFade, toePx, toeGroove);
vec2 toeGrade = toeSlope(vToe, ${glsl(TOE_LOOK.amplitude)} * toeFade, toePx);
vec2 toeDrop = vec2(dot(toeGrade, vec2(dFdx(vToe.x), dFdx(vToe.y))), dot(toeGrade, vec2(dFdy(vToe.x), dFdy(vToe.y))));
diffuseColor.rgb *= 1.0 - ${glsl(TOE_LOOK.grooveShade)} * toeGroove * toeFade;
`;

const FRAGMENT_NORMAL = /* glsl */ `
{
  vec3 toeSlopeX = dFdx(-vViewPosition);
  vec3 toeSlopeY = dFdy(-vViewPosition);
  vec3 toeR1 = cross(toeSlopeY, normal);
  vec3 toeR2 = cross(normal, toeSlopeX);
  float toeDet = dot(toeSlopeX, toeR1) * faceDirection;
  vec3 toeGradient = sign(toeDet) * (toeDrop.x * toeR1 + toeDrop.y * toeR2);
  normal = normalize(abs(toeDet) * normal - ${glsl(TOE_LOOK.strength)} * toeGradient);
}
`;

const patched = new WeakSet<Material>();

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

function toeShader(shader: WebGLProgramParametersWithUniforms, edges: number[]): void {
  shader.uniforms.uToeEdges = { value: edges };
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <color_fragment>',
    FRAGMENT_COLOR,
  );
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <normal_fragment_maps>',
    FRAGMENT_NORMAL,
  );
}

export function applyToes<M extends Material>(material: M, fields: ToeFields): M {
  if (patched.has(material)) return material;
  patched.add(material);
  const { low, high } = fields.edges;
  const edges = [low.base, low.slope, high.base, high.slope];
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    toeShader(shader, edges);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|toes`;
  material.needsUpdate = true;
  return material;
}
