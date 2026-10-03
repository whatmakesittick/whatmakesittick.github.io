import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { toRadians } from '@core/math';
import { SHIP } from '../../../../model/layout';
import type { Extent } from '../../../../model/layout';
import { orientFrom, polygonFan } from '../../../geometry/surface';
import type { Uv, Vec3 } from '../../../geometry/surface';
import { mergeParts } from '../../context';
import { box } from './kit';
import type { Plan } from './kit';
import { wallUv } from './maps';

type Quad = readonly [Vec3, Vec3, Vec3, Vec3];

interface Tier {
  y: number;
  plan: Plan;
}

interface BlockOptions {
  slope?: number;
  rake?: number;
  z?: number;
  roof?: boolean;
}

export const HOUSE = {
  base: 5.6,
  first: { x: [-20, 26] as Extent, half: 5.6, y: [5.6, 8.8] as Extent, chamfer: [1.4, 0.6] },
  second: {
    x: [4, 24.5] as Extent,
    half: 4.6,
    y: [8.65, 11.6] as Extent,
    chamfer: [1.2, 0.4],
    slope: toRadians(7),
  },
  bridge: {
    x: [13, 24.2] as Extent,
    half: 5.4,
    front: 1.3,
    levels: [11.45, 12.7, 14.3, 14.6, SHIP.bridgeTop],
    lean: 0.45,
    visor: 0.4,
    slope: toRadians(7),
  },
  wing: {
    x: [17.6, 22.6] as Extent,
    inner: 5.3,
    reach: 7.1,
    floor: 0.22,
    plate: 0.12,
    height: 1.1,
  },
  funnel: {
    x: [-8.7, -1.3] as Extent,
    half: 2.4,
    corner: 0.9,
    y: [8.6, 15.8] as Extent,
    rake: 1.2,
    slope: toRadians(8),
  },
  pane: 1.25,
} as const;

const ROOF_NORMAL = 0.7;
const GLASS_BAND = 1;
const QUAD = 4;
const FAR = 100;

export function chamferedPlan([aft, fore]: Extent, half: number, front: number, back = 0): Plan {
  const corners: Plan = [
    [aft + back, -half],
    [fore - front, -half],
    [fore, front - half],
    [fore, half - front],
    [fore - front, half],
    [aft + back, half],
    [aft, half - back],
    [aft, back - half],
  ];
  return corners.filter(([x, z], at) => {
    const [nx, nz] = corners[(at + 1) % corners.length];
    return x !== nx || z !== nz;
  });
}

const slant = (height: number, slope = 0) => Math.tan(slope) * height;

function normalOf([a, b, , d]: Quad): Vector3 {
  const along = new Vector3(...b).sub(new Vector3(...a));
  return along.cross(new Vector3(...d).sub(new Vector3(...a))).normalize();
}

function wallAt([x, y, z]: Vec3, normal: Vector3): Uv {
  if (Math.abs(normal.y) > ROOF_NORMAL) return wallUv('roof', x, z);
  if (Math.abs(normal.x) < Math.abs(normal.z)) return wallUv('side', x, y);
  return wallUv(normal.x > 0 ? 'front' : 'aft', z, y);
}

function quads(list: readonly Quad[], uvs: (quad: Quad, normal: Vector3) => Uv[]): BufferGeometry {
  const position: number[] = [];
  const normal: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  list.forEach((quad, at) => {
    const facing = normalOf(quad);
    quad.forEach((point) => {
      position.push(...point);
      normal.push(...facing.toArray());
    });
    uvs(quad, facing).forEach((pair) => uv.push(...pair));
    index.push(at * QUAD, at * QUAD + 1, at * QUAD + 2, at * QUAD, at * QUAD + 2, at * QUAD + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return geometry.setIndex(index);
}

function prism(tiers: readonly Tier[], glass: (band: number, segment: number) => boolean) {
  const [cx, cz] = tiers[0].plan.reduce(
    ([x, z], point, _, all) => [x + point[0] / all.length, z + point[1] / all.length],
    [0, 0],
  );
  const sorted: Record<'wall' | 'glass', Quad[]> = { wall: [], glass: [] };
  tiers.slice(1).forEach((upper, band) => {
    const lower = tiers[band];
    lower.plan.forEach((_, at) => {
      const next = (at + 1) % lower.plan.length;
      const point = (tier: Tier, i: number): Vec3 => [tier.plan[i][0], tier.y, tier.plan[i][1]];
      const quad: Quad = [
        point(lower, at),
        point(lower, next),
        point(upper, next),
        point(upper, at),
      ];
      const normal = normalOf(quad);
      const middle = new Vector3(...quad[0]).add(new Vector3(...quad[2])).multiplyScalar(1 / 2);
      const outward = normal.x * (middle.x - cx) + normal.z * (middle.z - cz) >= 0;
      const [a, b, c, d] = quad;
      sorted[glass(band, at) ? 'glass' : 'wall'].push(outward ? quad : [b, a, d, c]);
    });
  });
  return sorted;
}

const walls = (list: readonly Quad[]) =>
  quads(list, (quad, normal) => quad.map((point) => wallAt(point, normal)));

function cap(plan: Plan, y: number, up = true): BufferGeometry {
  const normal = new Vector3(0, up ? 1 : -1, 0);
  const fan = polygonFan(
    plan.map(([x, z]): Vec3 => [x, y, z]),
    (point) => wallAt(point, normal),
  );
  return orientFrom(fan, [plan[0][0], up ? -FAR : FAR, 0]);
}

export function blockTop(
  x: Extent,
  half: number,
  y: Extent,
  chamfer: readonly number[],
  options: BlockOptions = {},
) {
  const inset = slant(y[1] - y[0], options.slope);
  const shift = options.rake ?? 0;
  return chamferedPlan(
    [x[0] + inset - shift, x[1] - inset - shift],
    half - inset,
    chamfer[0],
    chamfer[1],
  );
}

function block(
  x: Extent,
  half: number,
  y: Extent,
  chamfer: readonly number[],
  options: BlockOptions = {},
) {
  const move = (plan: Plan): Plan => plan.map(([px, pz]) => [px, pz + (options.z ?? 0)]);
  const top = move(blockTop(x, half, y, chamfer, options));
  const tiers = [
    { y: y[0], plan: move(chamferedPlan(x, half, chamfer[0], chamfer[1])) },
    { y: y[1], plan: top },
  ];
  const sides = walls(prism(tiers, () => false).wall);
  return options.roof === false ? [sides] : [sides, cap(top, y[1])];
}

function bridge(): { walls: BufferGeometry[]; glass: BufferGeometry } {
  const { x, half, front, levels, lean, visor, slope } = HOUSE.bridge;
  const inset = slant(levels[1] - levels[0], slope);
  const hood = chamferedPlan([x[0], x[1] + lean + visor], half + visor, front);
  const plans = [
    chamferedPlan(x, half, front),
    chamferedPlan([x[0], x[1] - inset], half - inset, front),
    chamferedPlan([x[0], x[1] + lean], half, front),
    hood,
    hood,
  ];
  const aft = plans[0].length - 1;
  const sorted = prism(
    levels.map((y, at) => ({ y, plan: plans[at] })),
    (band, segment) => band === GLASS_BAND && segment !== aft,
  );
  const glass = quads(sorted.glass, ([a, b]) => {
    const span = Math.hypot(b[0] - a[0], b[2] - a[2]) / HOUSE.pane;
    return [
      [0, 1],
      [span, 1],
      [span, 0],
      [0, 0],
    ];
  });
  return {
    walls: [
      walls(sorted.wall),
      cap(hood, levels[levels.length - 1]),
      cap(plans[0], levels[0], false),
    ],
    glass,
  };
}

function textured(size: Vec3, centre: Vec3): BufferGeometry {
  const geometry = box(size, centre);
  const { position, normal, uv } = geometry.attributes;
  for (let at = 0; at < uv.count; at += 1) {
    const point: Vec3 = [position.getX(at), position.getY(at), position.getZ(at)];
    uv.setXY(at, ...wallAt(point, new Vector3().fromBufferAttribute(normal, at)));
  }
  return geometry;
}

function wings(): BufferGeometry[] {
  const { x, inner, reach, floor, plate, height } = HOUSE.wing;
  const level = HOUSE.second.y[1];
  const [length, middle, width] = [x[1] - x[0], (x[0] + x[1]) / 2, reach - inner];
  return [-1, 1].flatMap((side) => [
    textured([length, floor, width], [middle, level - floor / 2, side * (inner + width / 2)]),
    textured([length, height, plate], [middle, level + height / 2, side * (reach - plate / 2)]),
    textured(
      [plate, height, width],
      [x[1] - plate / 2, level + height / 2, side * (inner + width / 2)],
    ),
  ]);
}

export function buildHouse(): { walls: BufferGeometry; glass: BufferGeometry } {
  const { first, second, funnel } = HOUSE;
  const top = bridge();
  return {
    walls: mergeParts([
      ...block(first.x, first.half, first.y, first.chamfer),
      ...block(second.x, second.half, second.y, second.chamfer, { slope: second.slope }),
      ...block(funnel.x, funnel.half, funnel.y, [funnel.corner, funnel.corner], {
        slope: funnel.slope,
        rake: funnel.rake,
        roof: false,
      }),
      ...top.walls,
      ...wings(),
    ]),
    glass: top.glass,
  };
}
