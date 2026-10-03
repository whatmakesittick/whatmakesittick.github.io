import {
  BoxGeometry,
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { GROUND_STATION, SLIPWAY } from '../../../model/layout';
import { THEME } from '../../../theme';
import { gridSurface } from '../../geometry/surface';
import type { Vec3 } from '../../geometry/surface';
import { instanced, mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { canvasTexture, seededRandom } from '../surfaces';

export interface ShorePart {
  object: Group;
  stationAnchor: Object3D;
}

type Range = readonly [number, number];

const GRID = { x: [-1200, 160] as Range, z: [-2500, 2500] as Range, fine: [-140, 60] as Range };
const CELL = 2.5;
const GROWTH = 1.25;
const SHELF = 0.075;
const BEACH = { width: 30, slope: 1 / 15 } as const;
const TINT_JITTER = 0.4;
const FINE_MARGIN = 10;
const DUNE = { from: 22, height: 2.2, waves: [0.083, 0.061, 0.047, 1.3] as const };
const LAND = { from: 140, rise: 0.012, hills: 4, scale: 0.06 } as const;
const SLAB = { thickness: 0.35, reveal: 0.16, shoulder: 3, apron: [-28, 4] as const };
const PAD = { half: [17, 13] as const, blend: 16, thickness: 0.3 } as const;
const TINTS: readonly (readonly [string, number])[] = [
  ['#5e5547', -3],
  ['#6c6151', 1],
  [THEME.beach, 3],
  [THEME.beach, 18],
  ['#8a8858', 34],
  ['#6f6e50', 70],
  [THEME.shore, 140],
];
const SCRUB = {
  count: 240,
  seed: 211,
  x: [-130, -24] as Range,
  z: [-130, 50] as Range,
  size: [0.5, 1.4] as Range,
  squash: 0.6,
  sink: 0.3,
};
const SCRUB_TONES = ['#3a4129', '#55603a', '#6b6f48'] as const;
const RADOMES: readonly Range[] = [
  [-7, 1.25],
  [0, 1.75],
  [7, 1.4],
];
const PLINTH = { height: 1.2, share: 0.75 } as const;
const FENCE = {
  half: [15, 11] as const,
  height: 2.2,
  post: 0.06,
  spacing: 3,
  opacity: 0.35,
} as const;
const ANCHOR_LIFT = 2;
const GROOVES = { size: [256, 8] as const, pitch: 6, groove: 2, wet: 0.8 } as const;
const SEGMENTS = { dome: [24, 14] as const, plinth: 16, post: 6 } as const;
const PAINT = {
  groove: '#7d7d77',
  algae: '#4c5a3c',
  clear: 'rgba(0,0,0,0)',
  white: '#ffffff',
} as const;

const GROUND: MaterialFinish = {
  color: PAINT.white,
  vertexColors: true,
  roughness: 0.95,
  envMapIntensity: 0.3,
};
const SCRUB_FINISH: MaterialFinish = { color: PAINT.white, roughness: 0.95, envMapIntensity: 0.25 };
const RADOME: MaterialFinish = { color: THEME.radome, roughness: 0.55, envMapIntensity: 0.8 };
const METAL: MaterialFinish = { color: '#6d7378', roughness: 0.5, metalness: 0.6 };
const PAD_FINISH: MaterialFinish = { color: '#8d8c86', roughness: 0.9 };
const MESH: MaterialFinish = {
  ...METAL,
  transparent: true,
  opacity: FENCE.opacity,
  depthWrite: false,
  side: DoubleSide,
};

export function slabTop(x: number): number {
  const [from, to] = SLIPWAY.x;
  return lerp(SLIPWAY.top, SLIPWAY.foot, clamp((x - from) / (to - from), 0, 1));
}

function dune(x: number, z: number): number {
  const [a, b, c, warp] = DUNE.waves;
  return 0.5 + 0.5 * Math.sin(x * a + Math.sin(z * c) * warp) * Math.sin(z * b + x * c);
}

function naturalHeight(x: number, z: number): number {
  const inland = -x;
  if (inland < 0) return inland * SHELF;
  const land = Math.max(inland - LAND.from, 0);
  return (
    Math.min(inland, BEACH.width) * BEACH.slope +
    smoothstep(inland, DUNE.from, DUNE.from + BEACH.width) * DUNE.height * dune(x, z) +
    land * LAND.rise +
    LAND.hills * smoothstep(land, 0, LAND.from) * dune(x * LAND.scale, z * LAND.scale)
  );
}

function gap(x: number, z: number, xs: Range, half: number): number {
  return Math.hypot(Math.max(xs[0] - x, x - xs[1], 0), Math.max(Math.abs(z) - half, 0));
}

export function shoreHeight(x: number, z: number): number {
  const natural = naturalHeight(x, z);
  const [apronX, apronHalf] = SLAB.apron;
  const slip = gap(x, z, [apronX, SLIPWAY.x[1]], x < SLIPWAY.x[0] ? apronHalf : SLIPWAY.z[1]);
  const cut = slabTop(Math.max(x, SLIPWAY.x[0])) - SLAB.reveal;
  const height = lerp(Math.min(natural, cut), natural, smoothstep(slip, 0, SLAB.shoulder));
  const [hx, hz] = PAD.half;
  const pad = gap(x - GROUND_STATION[0], (z - GROUND_STATION[2]) * (hx / hz), [-hx, hx], hx);
  return lerp(GROUND_STATION[1], height, smoothstep(pad, 0, PAD.blend));
}

function lines([from, to]: Range, [fineFrom, fineTo]: Range): number[] {
  const values: number[] = [];
  for (let at = fineFrom; at <= fineTo; at += CELL) values.push(at);
  [
    [fineFrom, from, -1],
    [values[values.length - 1], to, 1],
  ].forEach(([start, end, sign]) => {
    for (let at = start, step = CELL; sign * (end - at) > 0; step *= GROWTH) {
      at += sign * step;
      values.push(sign > 0 ? Math.min(at, end) : Math.max(at, end));
    }
  });
  return [...new Set(values)].sort((a, b) => a - b);
}

function tint(x: number, y: number, z: number, target: Color): Color {
  const level = x > 0 ? y : -x;
  const index = TINTS.findIndex(([, at]) => level < at);
  if (index <= 0) return target.set(TINTS[index < 0 ? TINTS.length - 1 : 0][0]);
  const [[low, from], [high, to]] = [TINTS[index - 1], TINTS[index]];
  const share = clamp((level - from) / (to - from) + (dune(z, x) - 0.5) * TINT_JITTER, 0, 1);
  return target.set(low).lerp(new Color(high), share);
}

function ground(): BufferGeometry {
  const xs = lines(GRID.x, [GRID.fine[0], SLIPWAY.x[1] + FINE_MARGIN]);
  const zs = lines(GRID.z, GRID.fine);
  const rows = zs.map((z) => xs.map((x): Vec3 => [x, shoreHeight(x, z), z]));
  const surface = gridSurface(rows);
  const colour = new Color();
  const colours = rows.flatMap((row) =>
    row.flatMap(([x, y, z]) => tint(x, y, z, colour).toArray()),
  );
  return surface.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
}

function scrub(context: PartContext): Object3D {
  const random = seededRandom(SCRUB.seed);
  const up = new Vector3(0, 1, 0);
  const matrices = Array.from({ length: SCRUB.count }, () => {
    const x = lerp(...SCRUB.x, random());
    const z = lerp(...SCRUB.z, random());
    const size = lerp(...SCRUB.size, random());
    const at = new Vector3(x, shoreHeight(x, z) - size * SCRUB.squash * SCRUB.sink, z);
    const turn = new Quaternion().setFromAxisAngle(up, random() * Math.PI * 2);
    return new Matrix4().compose(at, turn, new Vector3(size, size * SCRUB.squash, size));
  });
  const mesh = instanced(
    context,
    new IcosahedronGeometry(1, 1),
    UNDIMMED_GROUP,
    SCRUB_FINISH,
    matrices,
  );
  const colour = new Color();
  matrices.forEach((_, index) =>
    mesh.setColorAt(index, colour.set(SCRUB_TONES[index % SCRUB_TONES.length])),
  );
  return mesh;
}

function slab(x: Range, top: Range, half: number): BufferGeometry {
  const box = new BoxGeometry(Math.hypot(x[1] - x[0], top[1] - top[0]), SLAB.thickness, 2 * half);
  box.translate(0, -SLAB.thickness / 2, 0);
  box.rotateZ(Math.atan2(top[1] - top[0], x[1] - x[0]));
  return box.translate((x[0] + x[1]) / 2, (top[0] + top[1]) / 2, 0);
}

function slipway(context: PartContext): Object3D {
  const { size, pitch, groove, wet } = GROOVES;
  const map = canvasTexture(...size, (pen, width, height) => {
    pen.fillStyle = THEME.concrete;
    pen.fillRect(0, 0, width, height);
    pen.fillStyle = PAINT.groove;
    for (let x = pitch; x < width; x += pitch) pen.fillRect(x, 0, groove, height);
    const band = pen.createLinearGradient(width * wet, 0, width, 0);
    band.addColorStop(0, PAINT.clear);
    band.addColorStop(1, PAINT.algae);
    pen.fillStyle = band;
    pen.fillRect(0, 0, width, height);
  });
  const [apronX, apronHalf] = SLAB.apron;
  const parts = [
    slab(SLIPWAY.x, [SLIPWAY.top, SLIPWAY.foot], SLIPWAY.z[1]),
    slab([apronX, SLIPWAY.x[0]], [SLIPWAY.top, SLIPWAY.top], apronHalf),
  ];
  const finish = { color: PAINT.white, roughness: 0.85, map: context.tracker.track(map) };
  return partMesh(context, mergeParts(parts), STRUCTURE_GROUP, finish);
}

function station(context: PartContext): { object: Group; anchor: Object3D } {
  const object = new Group();
  object.position.set(...GROUND_STATION);
  const domes = RADOMES.flatMap(([dx, radius]) => [
    new SphereGeometry(radius, ...SEGMENTS.dome).translate(
      dx,
      PLINTH.height + radius * PLINTH.share,
      0,
    ),
  ]);
  const plinths = RADOMES.map(([dx, radius]) =>
    new CylinderGeometry(
      radius * PLINTH.share,
      radius * PLINTH.share,
      PLINTH.height,
      SEGMENTS.plinth,
    ).translate(dx, PLINTH.height / 2, 0),
  );
  const [px, pz] = PAD.half;
  const [fx, fz] = FENCE.half;
  const corners: Vec3[] = [
    [-fx, 0, -fz],
    [fx, 0, -fz],
    [fx, 0, fz],
    [-fx, 0, fz],
    [-fx, 0, -fz],
  ];
  const posts: Matrix4[] = [];
  const strips = corners.slice(1).map((to, index) => {
    const from = corners[index];
    const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
    for (let at = 0; at < length; at += FENCE.spacing) {
      const share = at / length;
      posts.push(
        new Matrix4().makeTranslation(
          lerp(from[0], to[0], share),
          FENCE.height / 2,
          lerp(from[2], to[2], share),
        ),
      );
    }
    const top = (point: Vec3): Vec3 => [point[0], FENCE.height, point[2]];
    return gridSurface([
      [from, to],
      [top(from), top(to)],
    ]);
  });
  object.add(
    partMesh(context, new BoxGeometry(2 * px, PAD.thickness, 2 * pz), 'groundStation', PAD_FINISH),
    partMesh(context, mergeParts(domes), 'groundStation', RADOME),
    partMesh(context, mergeParts(plinths), 'groundStation', METAL),
    partMesh(context, mergeParts(strips), 'groundStation', MESH),
    instanced(
      context,
      new CylinderGeometry(FENCE.post, FENCE.post, FENCE.height, SEGMENTS.post),
      'groundStation',
      METAL,
      posts,
    ),
  );
  const [, middle] = RADOMES[1];
  return {
    object,
    anchor: anchorAt(object, 0, PLINTH.height + middle * (1 + PLINTH.share) + ANCHOR_LIFT, 0),
  };
}

export function createShore(context: PartContext): ShorePart {
  const object = new Group();
  const { object: base, anchor } = station(context);
  object.add(
    partMesh(context, ground(), UNDIMMED_GROUP, GROUND),
    scrub(context),
    slipway(context),
    base,
  );
  return { object, stationAnchor: anchor };
}
