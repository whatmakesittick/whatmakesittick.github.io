import { Color, DoubleSide, Mesh, PlaneGeometry, Vector4 } from 'three';
import type { BufferGeometry, IUniform, ShaderMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { LANE_LINE_WIDTH_M, ROPE_Z_M } from '../../../model';
import { THEME } from '../../../theme';
import type { PartContext } from '../context';
import {
  FLOOR_Y,
  HALF_EXTENT_M,
  LANE_LINE_Y,
  NEIGHBOUR_LINE_MIX,
  NEIGHBOUR_LINE_Z,
  NEIGHBOUR_ROPE_Z,
} from './constants';
import type { PoolFrame } from './constants';
import {
  CAUSTIC_GLSL,
  FRAGMENT_HEAD,
  FRAGMENT_TAIL,
  WATER_GLSL,
  fogShader,
  waterUniforms,
} from './shaders';

const SEAM_HALF_M = 0.004;
const SEAM_FADE_PX_M = { from: 0.03, to: 0.07 } as const;
const LINE_CAUSTIC = 0.08;
const FLOOR_CAUSTIC = 0.5;
const FLOOR_LIFT = 0.5;
const POOLING_SIGMA_M = 1.6;
const SHADOW = {
  shift: [-0.12, -0.18],
  body: 0.32,
  bodyRadius: 0.2,
  bodySoftness: 0.45,
  rope: 0.22,
  ropeSoftness: 0.22,
} as const;

const SHADOW_GLSL = /* glsl */ `
uniform vec4 uBody;
float segment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
  return length(p - a - ab * t);
}
float shade(vec2 world) {
  vec2 p = world - vec2(${SHADOW.shift[0]}, ${SHADOW.shift[1]});
  float body = 1.0 - smoothstep(0.0, ${SHADOW.bodySoftness}, segment(p, uBody.xy, uBody.zw) - ${SHADOW.bodyRadius});
  float z = abs(p.y);
  float near = min(abs(z - ${ROPE_Z_M}), abs(z - ${NEIGHBOUR_ROPE_Z}));
  float rope = 1.0 - smoothstep(0.0, ${SHADOW.ropeSoftness}, near);
  return 1.0 - ${SHADOW.body} * body - ${SHADOW.rope} * rope;
}
`;

const FLOOR_FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
${WATER_GLSL}
${CAUSTIC_GLSL}
${SHADOW_GLSL}
uniform vec3 uBase;
uniform vec3 uSeam;
uniform vec3 uLit;

float seam(float p) {
  float d = abs(fract(p / PERIOD + 0.5) - 0.5) * PERIOD;
  float w = fwidth(p);
  float h = max(${SEAM_HALF_M}, 0.5 * w);
  float line = 1.0 - smoothstep(h - 0.5 * w, h + 0.5 * w, d);
  return line * (${SEAM_HALF_M} / h) * (1.0 - smoothstep(${SEAM_FADE_PX_M.from}, ${SEAM_FADE_PX_M.to}, w));
}

void main() {
  vec2 p = vec2(vWorld.x - uScroll, vWorld.z);
  float pooling = exp(-p.y * p.y / (2.0 * ${POOLING_SIGMA_M * POOLING_SIGMA_M}));
  float lit = mix(0.6, 1.1, pooling) * shade(vWorld.xz);
  vec3 base = mix(uBase, uLit, ${FLOOR_LIFT});
  vec3 col = mix(base, uSeam, max(seam(p.x), seam(p.y)) * 0.7) * lit;
  col += uLit * caustic(p) * ${FLOOR_CAUSTIC} * lit * lit;
  gl_FragColor = vec4(waterFade(col), 1.0);
${FRAGMENT_TAIL}`;

const LINE_FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
${WATER_GLSL}
${CAUSTIC_GLSL}
${SHADOW_GLSL}
uniform vec3 uBase;
uniform vec3 uLit;
void main() {
  vec2 p = vec2(vWorld.x - uScroll, vWorld.z);
  float lit = shade(vWorld.xz);
  gl_FragColor = vec4(waterFade((uBase + uLit * caustic(p) * ${LINE_CAUSTIC}) * lit), 1.0);
${FRAGMENT_TAIL}`;

export interface Floor {
  readonly floor: Mesh;
  readonly laneLine: Mesh;
  readonly neighbours: Mesh;
  readonly body: Vector4;
}

function strip(z: number): BufferGeometry {
  return new PlaneGeometry(HALF_EXTENT_M * 2, LANE_LINE_WIDTH_M)
    .rotateX(-Math.PI / 2)
    .translate(0, LANE_LINE_Y, z);
}

function sharedUniforms(frame: PoolFrame, body: Vector4): Record<string, IUniform> {
  return {
    ...waterUniforms(),
    uScroll: frame.uScroll,
    uPhase: frame.uPhase,
    uBody: { value: body },
    uLit: { value: new Color(THEME.waterClear) },
  };
}

function lineMaterial(
  context: PartContext,
  group: string,
  uniforms: Record<string, IUniform>,
  base: Color,
): ShaderMaterial {
  return fogShader(context, group, {
    fragment: LINE_FRAGMENT,
    polygonOffset: true,
    uniforms: { ...uniforms, uBase: { value: base } },
  });
}

function mesh(context: PartContext, geometry: BufferGeometry, material: ShaderMaterial): Mesh {
  const result = new Mesh(context.tracker.track(geometry), material);
  result.frustumCulled = false;
  return result;
}

export function createFloor(context: PartContext, frame: PoolFrame): Floor {
  const size = HALF_EXTENT_M * 2;
  const body = new Vector4();
  const uniforms = sharedUniforms(frame, body);
  const floorMaterial = fogShader(context, UNDIMMED_GROUP, {
    fragment: FLOOR_FRAGMENT,
    side: DoubleSide,
    uniforms: {
      ...uniforms,
      uBase: { value: new Color(THEME.poolFloor) },
      uSeam: { value: new Color(THEME.tileSeam) },
    },
  });
  const floor = mesh(
    context,
    new PlaneGeometry(size, size).rotateX(-Math.PI / 2).translate(0, FLOOR_Y, 0),
    floorMaterial,
  );
  const line = new Color(THEME.laneLine);
  const laneLine = mesh(context, strip(0), lineMaterial(context, 'laneLine', uniforms, line));
  const faint = new Color(THEME.poolFloor).lerp(line, NEIGHBOUR_LINE_MIX);
  const merged = mergeGeometries([strip(-NEIGHBOUR_LINE_Z), strip(NEIGHBOUR_LINE_Z)]);
  const neighbours = mesh(context, merged, lineMaterial(context, UNDIMMED_GROUP, uniforms, faint));
  return { floor, laneLine, neighbours, body };
}
