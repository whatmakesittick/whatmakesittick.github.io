import { ExtrudeGeometry, Shape } from 'three';
import type { BufferGeometry } from 'three';
import { lerp } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { BODY } from '../../parts/car/dimensions';
import type { Vec2 } from './curve';
import { MeshBuilder, normalize } from './mesh';
import { mirrorParts } from './mirror';
import type { Vec3 } from './mesh';
import { spot } from './surface';
import type { BodySurface } from './surface';

export type DetailFinish = 'paint' | 'frame' | 'trim' | 'mirror' | 'lampRear';

const SPLITTER = { fromX: 1.86, inset: 0.02, reach: 0.045, thickness: 0.012, steps: 14 } as const;
const FINS = {
  fromX: -1.66,
  toX: -2.22,
  zs: [0, 0.36],
  thickness: 0.012,
  depth: 0.05,
  steps: 10,
} as const;
const INTAKE = { shares: [0.38, 0.68], height: 0.012, depth: 0.006, margin: 0.06 } as const;
const TAIL_LAMP = {
  drop: 0.06,
  height: 0.026,
  depth: 0.006,
  margin: 0.03,
  housing: 0.014,
} as const;
const RING_SEGMENTS = ['sill', 'side', 'shoulder', 'belt', 'glass', 'rail', 'crown'] as const;
const RING_STEPS = 24;
const FACE_PAIRS = [
  [0, 1],
  [2, 3],
  [4, 5],
] as const;

function rockerPoint(surface: BodySurface, x: number, mirror: number): Vec3 {
  return surface.point(x, spot('sill', 0), mirror);
}

function noseOutline(surface: BodySurface): Vec3[] {
  const xs = Array.from({ length: SPLITTER.steps + 1 }, (_, step) =>
    lerp(SPLITTER.fromX, BODY.halfLength, Math.sin((step / SPLITTER.steps) * (Math.PI / 2))),
  );
  const right = xs.map((x) => rockerPoint(surface, x, 1));
  const left = [...xs].reverse().map((x) => rockerPoint(surface, x, -1));
  return [...right, ...left];
}

function outwardOf(points: readonly Vec3[], index: number): Vec3 {
  const before = points[Math.max(0, index - 1)];
  const after = points[Math.min(points.length - 1, index + 1)];
  return normalize([before[2] - after[2], 0, after[0] - before[0]]);
}

export function splitter(surface: BodySurface): BufferGeometry {
  const outline = noseOutline(surface);
  const builder = new MeshBuilder();
  const rings = outline.map((point, index) => {
    const out = outwardOf(outline, index);
    const at = (reach: number, drop: number): Vec3 => [
      point[0] + out[0] * reach,
      point[1] - drop,
      point[2] + out[2] * reach,
    ];
    const inner = -SPLITTER.inset;
    const outer = SPLITTER.reach;
    return [
      builder.vertex(at(inner, 0), [0, 1, 0]),
      builder.vertex(at(outer, 0), [0, 1, 0]),
      builder.vertex(at(outer, 0), out),
      builder.vertex(at(outer, SPLITTER.thickness), out),
      builder.vertex(at(outer, SPLITTER.thickness), [0, -1, 0]),
      builder.vertex(at(inner, SPLITTER.thickness), [0, -1, 0]),
    ];
  });
  rings.slice(0, -1).forEach((ring, index) => {
    const next = rings[index + 1];
    FACE_PAIRS.forEach(([a, b]) => builder.quad(ring[a], ring[b], next[b], next[a]));
  });
  return builder.build();
}

function finShape(surface: BodySurface): Shape {
  const floor = spot('floor', 0);
  const xs = Array.from(
    { length: FINS.steps + 1 },
    (_, step) => FINS.fromX + ((FINS.toX - FINS.fromX) * step) / FINS.steps,
  );
  const tops = xs.map((x) => [x, surface.point(x, floor)[1]] as const);
  const shape = new Shape();
  tops.forEach(([x, top], index) => {
    const bottom = Math.max(0, top - FINS.depth);
    if (index === 0) shape.moveTo(x, bottom);
    else shape.lineTo(x, bottom);
  });
  [...tops].reverse().forEach(([x, top]) => shape.lineTo(x, top));
  shape.closePath();
  return shape;
}

export function diffuserFins(surface: BodySurface): BufferGeometry[] {
  const shape = finShape(surface);
  const zs = FINS.zs.flatMap((z) => (z === 0 ? [0] : [z, -z]));
  return zs.map((z) => {
    const geometry = new ExtrudeGeometry(shape, { depth: FINS.thickness, bevelEnabled: false });
    geometry.translate(0, 0, z - FINS.thickness / 2);
    return geometry;
  });
}

function ringPoints(surface: BodySurface, x: number): Vec2[] {
  const section = surface.section(x);
  return RING_SEGMENTS.flatMap((segment) =>
    Array.from({ length: RING_STEPS + 1 }, (_, step) => section.point(segment, step / RING_STEPS)),
  );
}

export function ringReach(surface: BodySurface, x: number, y: number): number {
  const ring = ringPoints(surface, x);
  return ring.slice(1).reduce((reach, [z, height], index) => {
    const [startZ, startY] = ring[index];
    if ((startY - y) * (height - y) > 0 || startY === height) return reach;
    const share = (y - startY) / (height - startY);
    return Math.max(reach, startZ + (z - startZ) * share);
  }, 0);
}

function capBar(surface: BodySurface, x: number, y: number, size: CapBarSize): BufferGeometry {
  const reach = ringReach(surface, x, y) - size.margin;
  const outward = Math.sign(x);
  const [near, far] = [x, x + outward * size.depth];
  return box({
    minX: Math.min(near, far),
    maxX: Math.max(near, far),
    minY: y - size.height / 2,
    maxY: y + size.height / 2,
    minZ: -reach,
    maxZ: reach,
  });
}

interface CapBarSize {
  height: number;
  depth: number;
  margin: number;
}

export function intakeSlats(surface: BodySurface): BufferGeometry[] {
  const section = surface.section(BODY.halfLength);
  const [low, high] = [section.point('sill', 0)[1], section.point('sill', 1)[1]];
  return INTAKE.shares.map((share) =>
    capBar(surface, BODY.halfLength, lerp(low, high, share), {
      height: INTAKE.height,
      depth: INTAKE.depth,
      margin: INTAKE.margin,
    }),
  );
}

export function tailLamp(surface: BodySurface): Map<DetailFinish, BufferGeometry[]> {
  const x = -BODY.halfLength;
  const top = surface.section(x).point('crown', 1)[1];
  const y = top - TAIL_LAMP.drop;
  const lamp = capBar(surface, x, y, TAIL_LAMP);
  const housing = capBar(surface, x, y, {
    height: TAIL_LAMP.height + TAIL_LAMP.housing,
    depth: TAIL_LAMP.depth / 2,
    margin: TAIL_LAMP.margin - TAIL_LAMP.housing / 2,
  });
  return new Map<DetailFinish, BufferGeometry[]>([
    ['lampRear', [lamp]],
    ['frame', [housing]],
  ]);
}

export function bodyDetails(surface: BodySurface): Map<DetailFinish, BufferGeometry[]> {
  const mirrors = mirrorParts(surface);
  const tail = tailLamp(surface);
  return new Map<DetailFinish, BufferGeometry[]>([
    ['paint', mirrors.get('paint') ?? []],
    ['mirror', mirrors.get('mirror') ?? []],
    ['lampRear', tail.get('lampRear') ?? []],
    [
      'frame',
      [...(mirrors.get('frame') ?? []), ...(tail.get('frame') ?? []), ...intakeSlats(surface)],
    ],
    ['trim', [splitter(surface), ...diffuserFins(surface)]],
  ]);
}
