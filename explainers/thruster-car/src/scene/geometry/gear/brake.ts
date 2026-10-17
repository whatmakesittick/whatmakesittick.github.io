import { CylinderGeometry, ExtrudeGeometry, RingGeometry, Shape } from 'three';
import type { BufferGeometry, DataTexture } from 'three';
import { FULL_TURN, lerp } from '@core/math';
import { mergeParts } from '../../parts/context';
import { pinnedUv } from './attributes';
import { latheAround } from './lathe';
import { HALF_TURN, QUARTER_TURN } from '../turns';
import { waveDip } from '../wave';
import type { Profile } from './lathe';
import { grey, paintTexture, ridge, seamDistance } from './maps';

const DISC = {
  inner: 0.105,
  outer: 0.19,
  centreZ: -0.025,
  thickness: 0.03,
  segments: 28,
} as const;

const HAT_PROFILE: Profile = [
  [DISC.inner + 0.004, DISC.centreZ - DISC.thickness / 2],
  [0.098, 0.04],
  [0.03, 0.046],
];

const HAT_SEGMENTS = 18;
const HAT_TEXEL = [0.02, 0.02] as const;

export const CALIPER = {
  inner: 0.158,
  outer: 0.214,
  span: 0.82,
  angle: (FULL_TURN * 3) / 8,
  back: -0.072,
  front: 0.02,
  bevel: 0.006,
  curveSegments: 4,
} as const;

const SLOTS = {
  count: 6,
  sweep: 0.55,
  from: 0.66,
  to: 0.93,
  halfWidth: 0.012,
  soft: 0.008,
  shade: 0.32,
  base: 0.78,
  rings: 140,
  ringDepth: 0.05,
  rim: 0.97,
  rimShade: 0.6,
  hatZone: 1.2,
  hatShade: 0.45,
} as const;

const DISC_MAP = { width: 256, height: 256 } as const;

function discFace(z: number, facing: 1 | -1): BufferGeometry {
  const face = new RingGeometry(DISC.inner, DISC.outer, DISC.segments, 1);
  if (facing < 0) face.rotateY(HALF_TURN);
  face.translate(0, 0, z);
  return face;
}

function discEdge(): BufferGeometry {
  const edge = new CylinderGeometry(DISC.outer, DISC.outer, DISC.thickness, DISC.segments, 1, true);
  edge.rotateX(QUARTER_TURN);
  edge.translate(0, 0, DISC.centreZ);
  return edge;
}

export function discGeometry(): BufferGeometry {
  const hat = latheAround(HAT_PROFILE, { axis: 'z', segments: HAT_SEGMENTS });
  return mergeParts([
    discFace(DISC.centreZ + DISC.thickness / 2, 1),
    discFace(DISC.centreZ - DISC.thickness / 2, -1),
    pinnedUv(discEdge(), ...HAT_TEXEL),
    pinnedUv(hat, ...HAT_TEXEL),
  ]);
}

function caliperShape(): Shape {
  const start = CALIPER.angle - CALIPER.span / 2;
  const end = CALIPER.angle + CALIPER.span / 2;
  const shape = new Shape();
  shape.absarc(0, 0, CALIPER.outer, start, end, false);
  shape.absarc(0, 0, CALIPER.inner, end, start, true);
  shape.closePath();
  return shape;
}

export function caliperGeometry(): BufferGeometry {
  const depth = CALIPER.front - CALIPER.back - 2 * CALIPER.bevel;
  const geometry = new ExtrudeGeometry(caliperShape(), {
    depth,
    bevelEnabled: true,
    bevelThickness: CALIPER.bevel,
    bevelSize: CALIPER.bevel,
    bevelSegments: 1,
    curveSegments: CALIPER.curveSegments,
  });
  geometry.translate(0, 0, CALIPER.back + CALIPER.bevel);
  return geometry;
}

function slotShade(radius: number, angle: number): number {
  if (radius < SLOTS.from || radius > SLOTS.to) return 0;
  const along = (radius - SLOTS.from) / (SLOTS.to - SLOTS.from);
  const turn = (angle + along * SLOTS.sweep) / FULL_TURN;
  const across = seamDistance(turn * SLOTS.count) * ((FULL_TURN * radius) / SLOTS.count);
  return ridge(across, 0, SLOTS.halfWidth, SLOTS.soft);
}

export function discTexture(): DataTexture {
  return paintTexture(DISC_MAP, (u, v) => {
    const x = 2 * u - 1;
    const y = 2 * v - 1;
    const radius = Math.hypot(x, y);
    const rings = waveDip(SLOTS.ringDepth, radius * SLOTS.rings);
    if (radius > SLOTS.hatZone) return grey(SLOTS.hatShade);
    const base = radius > SLOTS.rim ? SLOTS.rimShade : SLOTS.base * rings;
    return grey(lerp(base, SLOTS.shade, slotShade(radius, Math.atan2(y, x))));
  });
}
