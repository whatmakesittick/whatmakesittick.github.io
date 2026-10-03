import { DataTexture, LinearFilter, NoColorSpace, RGBAFormat, Vector4 } from 'three';
import { HULL_LINES, SEA } from '../../constants';
import { halfBreadthAt } from '../../geometry/hullLines';

const CHANNELS = 4;
const BYTE = 255;

export function hullPlanTexture(): DataTexture {
  const { columns, rows, x, y, scale } = SEA.plan;
  const pixels = new Uint8Array(columns * rows * CHANNELS);
  for (let row = 0; row < rows; row += 1) {
    const at = y[0] + ((row + 0.5) / rows) * (y[1] - y[0]);
    for (let column = 0; column < columns; column += 1) {
      const along = x[0] + ((column + 0.5) / columns) * (x[1] - x[0]);
      const value = Math.round(Math.min(halfBreadthAt(along, at) / scale, 1) * BYTE);
      pixels.set([value, 0, 0, BYTE], (row * columns + column) * CHANNELS);
    }
  }
  const texture = new DataTexture(pixels, columns, rows, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function hullPlanRange(): Vector4 {
  const { x, y } = SEA.plan;
  return new Vector4(x[0], x[1], y[0], y[1]);
}

export const HULL_MASK_GLSL = /* glsl */ `
uniform mat4 uBoatInverse;
uniform sampler2D uHullPlan;
uniform vec4 uHullPlanRange;
uniform float uOpenPort;

bool insideHull(vec3 world, float margin) {
  vec3 local = (uBoatInverse * vec4(world, 1.0)).xyz;
  if (uOpenPort > 0.5 && local.z < 0.0 && local.x < ${HULL_LINES.cutX.toFixed(2)}) return false;
  vec2 uv = vec2(
    (local.x - uHullPlanRange.x) / (uHullPlanRange.y - uHullPlanRange.x),
    (local.y - uHullPlanRange.z) / (uHullPlanRange.w - uHullPlanRange.z)
  );
  if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0) return false;
  float halfBreadth = texture2D(uHullPlan, vec2(uv.x, min(uv.y, 0.999))).r * ${SEA.plan.scale.toFixed(3)};
  return abs(local.z) < halfBreadth - margin;
}
`;
