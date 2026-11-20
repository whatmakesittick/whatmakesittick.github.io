import { Color, DoubleSide, Mesh, PlaneGeometry } from 'three';
import type { BufferGeometry, ShaderMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { LANE_LINE_WIDTH_M } from '../../../model';
import { THEME } from '../../../theme';
import type { PartContext } from '../context';
import {
  FLOOR_Y,
  HALF_EXTENT_M,
  LANE_LINE_Y,
  NEIGHBOUR_LINE_MIX,
  NEIGHBOUR_LINE_Z,
} from './constants';
import type { PoolFrame } from './constants';
import { CAUSTIC_GLSL, FRAGMENT_HEAD, FRAGMENT_TAIL, fogShader } from './shaders';

const SEAM_HALF_M = 0.004;
const LINE_CAUSTIC = 0.07;
const FLOOR_CAUSTIC = 0.2;
const POOLING_SIGMA_M = 1.5;

const FLOOR_FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
${CAUSTIC_GLSL}
uniform vec3 uBase;
uniform vec3 uSeam;
uniform vec3 uLit;

float seam(float p) {
  float d = abs(fract(p / PERIOD + 0.5) - 0.5) * PERIOD;
  float w = fwidth(p);
  return (1.0 - smoothstep(${SEAM_HALF_M}, ${SEAM_HALF_M} + w * 1.5, d)) * (1.0 - smoothstep(0.05, 0.15, w));
}

void main() {
  vec2 p = vec2(vWorld.x - uScroll, vWorld.z);
  float pooling = exp(-p.y * p.y / (2.0 * ${POOLING_SIGMA_M * POOLING_SIGMA_M}));
  float lit = mix(0.55, 1.1, pooling);
  vec3 col = mix(uBase, uSeam, max(seam(p.x), seam(p.y)) * 0.7) * lit;
  col += uLit * caustic(p) * ${FLOOR_CAUSTIC} * lit;
  gl_FragColor = vec4(col, 1.0);
${FRAGMENT_TAIL}`;

const LINE_FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
${CAUSTIC_GLSL}
uniform vec3 uBase;
uniform vec3 uLit;
void main() {
  vec2 p = vec2(vWorld.x - uScroll, vWorld.z);
  gl_FragColor = vec4(uBase + uLit * caustic(p) * ${LINE_CAUSTIC}, 1.0);
${FRAGMENT_TAIL}`;

export interface Floor {
  readonly floor: Mesh;
  readonly laneLine: Mesh;
  readonly neighbours: Mesh;
}

function strip(z: number): BufferGeometry {
  return new PlaneGeometry(HALF_EXTENT_M * 2, LANE_LINE_WIDTH_M)
    .rotateX(-Math.PI / 2)
    .translate(0, LANE_LINE_Y, z);
}

function lineMaterial(
  context: PartContext,
  group: string,
  frame: PoolFrame,
  base: Color,
): ShaderMaterial {
  return fogShader(context, group, {
    fragment: LINE_FRAGMENT,
    polygonOffset: true,
    uniforms: {
      uScroll: frame.uScroll,
      uPhase: frame.uPhase,
      uBase: { value: base },
      uLit: { value: new Color(THEME.waterClear) },
    },
  });
}

function mesh(context: PartContext, geometry: BufferGeometry, material: ShaderMaterial): Mesh {
  const result = new Mesh(context.tracker.track(geometry), material);
  result.frustumCulled = false;
  return result;
}

export function createFloor(context: PartContext, frame: PoolFrame): Floor {
  const size = HALF_EXTENT_M * 2;
  const floorMaterial = fogShader(context, UNDIMMED_GROUP, {
    fragment: FLOOR_FRAGMENT,
    side: DoubleSide,
    uniforms: {
      uScroll: frame.uScroll,
      uPhase: frame.uPhase,
      uBase: { value: new Color(THEME.poolFloor) },
      uSeam: { value: new Color(THEME.tileSeam) },
      uLit: { value: new Color(THEME.waterClear) },
    },
  });
  const floor = mesh(
    context,
    new PlaneGeometry(size, size).rotateX(-Math.PI / 2).translate(0, FLOOR_Y, 0),
    floorMaterial,
  );
  const line = new Color(THEME.laneLine);
  const laneLine = mesh(context, strip(0), lineMaterial(context, 'laneLine', frame, line));
  const faint = new Color(THEME.poolFloor).lerp(line, NEIGHBOUR_LINE_MIX);
  const merged = mergeGeometries([strip(-NEIGHBOUR_LINE_Z), strip(NEIGHBOUR_LINE_Z)]);
  const neighbours = mesh(context, merged, lineMaterial(context, UNDIMMED_GROUP, frame, faint));
  return { floor, laneLine, neighbours };
}
