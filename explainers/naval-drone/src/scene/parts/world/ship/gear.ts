import {
  CubicBezierCurve3,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Curve } from 'three';
import { lerp } from '@core/math';
import { SHIP } from '../../../../model/layout';
import { spread } from '../../../geometry/curves';
import { gridSurface, orientFrom, polygonFan } from '../../../geometry/surface';
import type { Vec3 } from '../../../geometry/surface';
import { mergeParts } from '../../context';
import {
  BULWARK,
  DECK_STATIONS,
  deckAt,
  deckEdgeY,
  deckHalf,
  edgeSlope,
  hullPoint,
  sectionZ,
  topY,
} from './hull';
import { HOUSE, blockTop, chamferedPlan } from './house';
import { SEGMENTS, box, lathe, mirrored, painted, rod } from './kit';
import type { Plan } from './kit';
import { HAWSE, PAINT, RAIL } from './maps';

const SINK = 0.1;
const SIDES = [-1, 1] as const;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const UNIT = new Vector3(1, 1, 1);
const QUARTER = Math.PI / 2;
const ROOF = HOUSE.first.y[1];

const FORE = {
  windlass: [43.4, 1.7],
  gypsy: [0.42, 0.32, 0.6],
  drum: [0.36, 0.22, 0.48],
  bed: [1.8, 0.25, 1.1] as Vec3,
  pipe: [46.6, 2.5],
  pipeRing: [
    [0.3, -0.12],
    [0.44, -0.12],
    [0.44, 0.06],
    [0.3, 0.13],
  ] as Plan,
  hawseRing: [
    [0.44, -0.15],
    [0.62, -0.15],
    [0.62, 0.06],
    [0.44, 0.16],
  ] as Plan,
  stays: [38, 53.5, 10, 0.05, 0.3],
} as const;

const DECK = {
  vent: [
    [0.18, -0.1],
    [0.18, 0.72],
    [0.42, 0.76],
    [0.46, 0.86],
    [0.3, 0.98],
    [0, 1],
  ] as Plan,
  vents: [
    [38.5, 2.6],
    [-36, 4.5],
  ] as Plan,
  roofVents: [
    [1.5, 2.4],
    [-0.2, 0],
  ] as Plan,
  hatches: [
    [-40, 0, 3.2, 2.6],
    [-27, -2.6, 1.6, 1.4],
    [40.8, 0, 1.4, 1.4],
  ],
  hatch: 0.3,
  bollards: [
    [-52, 0.9],
    [-44, 0.8],
    [-31, 0.8],
    [-24, 0.8],
    [29, 0.9],
    [40.5, 1],
    [49.5, 1],
  ] as Plan,
  bollard: { base: [1.1, 0.12, 0.45] as Vec3, offset: 0.32, radius: 0.15, height: 0.6 },
} as const;

const TOP = {
  radomes: [16.3, 3.4, 0.22, 0.9, 0.7],
  struts: [[18.2, 22], [5.4, 6.8], 0.1],
  stacks: [[-0.9, 0.9], 0.34, 0.75],
} as const;

const RAFT = { xs: [5.6, 7.4, 9.2, 11], z: 5.08, length: 1.3, radius: 0.3 } as const;

const CHAIN = {
  pitch: 0.27,
  link: [0.11, 0.034, 1.55],
  segments: [8, 3],
  exit: 0.3,
  drop: [6.4, -8.8, 1.1] as Vec3,
  leave: [0.8, -1.6],
  settle: [-2.6, 2.4, -0.3] as Vec3,
} as const;

const LAMPS: readonly (readonly number[])[] = [
  [-15.5, 8.45, 5.6, 0, 0, 1],
  [1.8, 8.45, 5.6, 0, 0, 1],
  [19.8, 8.45, 5.6, 0, 0, 1],
  [-20, 8.45, 2.5, -1, 0, 0],
  [26, 8.45, 3, 1, 0, 0],
  [20.1, 11.38, 6.4, 0, -1, 0],
  [12.34, 16.4, 0, 1, 0, 0],
];
const LAMP = [0.1, 0.15] as const;

export const RADAR = {
  x: 14.9,
  joint: 19.6,
  bar: [4.4, 0.42, 0.2] as Vec3,
  slot: [4.1, 0.07, 0.1] as Vec3,
  neck: 0.12,
} as const;

const MAST = {
  x: SHIP.mastX,
  base: HOUSE.second.y[1],
  split: 18,
  radius: [0.42, 0.14],
  legs: [8.2, 2.3, 17.2, 0.2],
  platform: [10.9, 16.3, 1.6, 18.7, 0.14],
  braces: [18.05, 15.9, 1.2, 0.08],
  rail: [0.85, 0.05],
  yard: [24.5, 3, 0.18, 0.22],
  masthead: [27, 0.28],
  pedestal: [0.7, 0.75, 0.55] as Vec3,
  drum: 0.25,
} as const;

const RAIL_EDGE = { inset: 0.12, overlap: 4 } as const;

const tint = (colour: string, ...parts: BufferGeometry[]) =>
  parts.map((part) => painted(part, colour));
const onDeck = ([x, z]: readonly number[]): Vec3 => [x, deckAt(x, z), z];
const mastRadius = (y: number) =>
  lerp(MAST.radius[0], MAST.radius[1], (y - MAST.base) / (SHIP.mastTop - MAST.base));
const wheel = (radius: number, width: number, [x, y, z]: Vec3) =>
  rod([x, y, z - width / 2], [x, y, z + width / 2], radius, SEGMENTS.large);
const turned = (normal: Vector3) => new Quaternion().setFromUnitVectors(Y_AXIS, normal);

function anchorGear(): BufferGeometry[] {
  const [gypsy, width, axle] = FORE.gypsy;
  const [drum, drumWidth, offset] = FORE.drum;
  return SIDES.flatMap((side) => {
    const deck = onDeck([FORE.windlass[0], side * FORE.windlass[1]]);
    const hub: Vec3 = [deck[0], deck[1] + axle, deck[2]];
    const [point, normal] = hullPoint(HAWSE.x, HAWSE.y, side);
    const hawse = lathe(FORE.hawseRing, SEGMENTS.large, [0, 0, 0])
      .applyQuaternion(turned(normal))
      .translate(...point);
    const pipe = lathe(FORE.pipeRing, SEGMENTS.medium, onDeck([FORE.pipe[0], side * FORE.pipe[1]]));
    return [
      ...tint(
        PAINT.dark,
        box(FORE.bed, deck),
        wheel(drum, drumWidth, [hub[0], hub[1], hub[2] - side * offset]),
        hawse,
        pipe,
      ),
      ...tint(PAINT.hull, wheel(gypsy, width, hub)),
    ];
  });
}

function stays(): BufferGeometry[] {
  const [from, to, count, thick, deep] = FORE.stays;
  return spread(from, to, count).flatMap((x) => {
    const height = topY(x) - deckEdgeY(x) - SINK;
    const middle = deckEdgeY(x) + height / 2 - SINK;
    const z = sectionZ(x, middle) - BULWARK.thickness - deep / 2;
    return tint(
      PAINT.hull,
      ...SIDES.map((side) =>
        box([thick, height, deep], [x, middle, side * z], -side * Math.atan(edgeSlope(x))),
      ),
    );
  });
}

function deckFittings(): BufferGeometry[] {
  const { vent, vents, roofVents, hatches, hatch } = DECK;
  const spots = [
    ...mirrored(vents, 1).map(onDeck),
    ...mirrored(roofVents, 1).map(([x, z]): Vec3 => [x, ROOF, z]),
  ];
  return tint(
    PAINT.hull,
    ...spots.map((spot) => lathe(vent, SEGMENTS.medium, spot)),
    ...hatches.map(([x, z, length, width]) => box([length, hatch, width], [x, deckAt(x, z), z])),
  );
}

function topside(): BufferGeometry[] {
  const roof = SHIP.bridgeTop;
  const [domeX, domeZ, post, tall, radius] = TOP.radomes;
  const domes = SIDES.map((side) =>
    new SphereGeometry(radius, SEGMENTS.medium, SEGMENTS.small).translate(
      domeX,
      roof + tall + radius,
      side * domeZ,
    ),
  );
  const posts = SIDES.map((side) =>
    rod([domeX, roof, side * domeZ], [domeX, roof + tall, side * domeZ], post),
  );
  const [xs, [inner, outer], strut] = TOP.struts;
  const floor = HOUSE.second.y[1] - HOUSE.wing.floor;
  const struts = SIDES.flatMap((side) =>
    xs.map((x) => rod([x, ROOF, side * inner], [x, floor, side * outer], strut)),
  );
  const { funnel } = HOUSE;
  const top = funnel.y[1];
  const centre = (funnel.x[0] + funnel.x[1]) / 2 - funnel.rake;
  const plan = blockTop(funnel.x, funnel.half, funnel.y, [funnel.corner, funnel.corner], funnel);
  const cap = orientFrom(polygonFan(plan.map(([x, z]): Vec3 => [x, top, z])), [centre, 0, 0]);
  const [offsets, stack, rise] = TOP.stacks;
  const stacks = offsets.map((dx) =>
    rod([centre + dx, top - SINK, 0], [centre + dx, top + rise, 0], stack, SEGMENTS.medium),
  );
  return [
    ...tint(PAINT.white, ...domes),
    ...tint(PAINT.hull, ...posts, ...struts),
    ...tint(PAINT.soot, cap, ...stacks),
  ];
}

function mastFoot(): BufferGeometry[] {
  const [footX, footZ, head, radius] = MAST.legs;
  return tint(
    PAINT.hull,
    rod(
      [MAST.x, MAST.base, 0],
      [MAST.x, MAST.split, 0],
      mastRadius(MAST.base),
      SEGMENTS.medium,
      mastRadius(MAST.split),
    ),
    ...SIDES.map((side) =>
      rod([footX, MAST.base, side * footZ], [MAST.x - mastRadius(head), head, 0], radius),
    ),
  );
}

export function fittings(): BufferGeometry {
  return mergeParts([...anchorGear(), ...stays(), ...deckFittings(), ...topside(), ...mastFoot()]);
}

function platformRail(): BufferGeometry[] {
  const [aft, fore, half, top] = MAST.platform;
  const [height, post] = MAST.rail;
  const corners: Vec3[] = [
    [aft, top, -half],
    [fore, top, -half],
    [fore, top, half],
    [aft, top, half],
  ];
  return corners.flatMap(([x, y, z], at) => {
    const [nx, , nz] = corners[(at + 1) % corners.length];
    const rail = (lift: number) =>
      rod([x, y + lift, z], [nx, y + lift, nz], post / 2, SEGMENTS.square);
    return [
      rod([x, y, z], [x, y + height, z], post / 2, SEGMENTS.square),
      rail(height),
      rail(height / 2),
    ];
  });
}

export function mastHead(): BufferGeometry {
  const [aft, fore, half, top, thick] = MAST.platform;
  const [from, to, reach, brace] = MAST.braces;
  const [yardY, yardHalf, size, lamp] = MAST.yard;
  const [headY, headSize] = MAST.masthead;
  const tips = SIDES.map((side): Vec3 => [MAST.x, yardY - size, side * yardHalf]);
  return mergeParts([
    ...tint(
      PAINT.hull,
      rod(
        [MAST.x, MAST.split, 0],
        [MAST.x, SHIP.mastTop, 0],
        mastRadius(MAST.split),
        SEGMENTS.medium,
        MAST.radius[1],
      ),
      ...SIDES.map((side) => rod([MAST.x, from, 0], [to, top, side * reach], brace)),
      box([size, size, 2 * yardHalf], [MAST.x, yardY, 0]),
      ...platformRail(),
    ),
    ...tint(PAINT.dark, box([fore - aft, thick, 2 * half], [(aft + fore) / 2, top - thick / 2, 0])),
    ...tint(
      PAINT.dark,
      rod([RADAR.x, top, 0], [RADAR.x, RADAR.joint, 0], MAST.drum, SEGMENTS.medium),
    ),
    ...tint(
      PAINT.white,
      ...tips.map((tip) => box([lamp, lamp, lamp], tip)),
      box([headSize, headSize, headSize], [MAST.x + mastRadius(headY), headY, 0]),
      box(MAST.pedestal, [RADAR.x, top + MAST.pedestal[1] / 2, 0]),
    ),
  ]);
}

export function antenna(): BufferGeometry {
  const [length, height, depth] = RADAR.bar;
  const middle = SHIP.radarHeight - RADAR.joint;
  return mergeParts([
    painted(box([length, height, depth], [0, middle, 0]), PAINT.white),
    ...tint(
      PAINT.dark,
      box(RADAR.slot, [0, middle, depth / 2]),
      rod([0, 0, 0], [0, middle, 0], RADAR.neck),
    ),
  ]);
}

export function bollard(): BufferGeometry {
  const { base, offset, radius, height } = DECK.bollard;
  return mergeParts(
    tint(
      PAINT.dark,
      box(base, [0, 0, 0]),
      ...SIDES.map((side) => rod([side * offset, 0, 0], [side * offset, height, 0], radius)),
    ),
  );
}

export function bollardSpots(): Matrix4[] {
  const spots = DECK.bollards.map(([x, inset]) => [x, deckHalf(x) - inset] as const);
  return mirrored(spots, 1).map(([x, z]) => {
    const turn = new Quaternion().setFromAxisAngle(Y_AXIS, Math.atan(-Math.sign(z) * edgeSlope(x)));
    return new Matrix4().compose(new Vector3(...onDeck([x, z])), turn, UNIT);
  });
}

export function raft(): BufferGeometry {
  return painted(
    rod([-RAFT.length / 2, 0, 0], [RAFT.length / 2, 0, 0], RAFT.radius, SEGMENTS.medium),
    PAINT.white,
  );
}

export function raftSpots(): Matrix4[] {
  return RAFT.xs.flatMap((x) =>
    SIDES.map((side) => new Matrix4().makeTranslation(x, ROOF + RAFT.radius, side * RAFT.z)),
  );
}

export function chainLink(): BufferGeometry {
  const [radius, bar, stretch] = CHAIN.link;
  return new TorusGeometry(radius, bar, CHAIN.segments[1], CHAIN.segments[0]).scale(stretch, 1, 1);
}

function links(curve: Curve<Vector3>): Matrix4[] {
  return spread(0, 1, Math.floor(curve.getLength() / CHAIN.pitch)).map((share, at) => {
    const roll = new Quaternion().setFromAxisAngle(X_AXIS, (at % 2) * QUARTER);
    const turn = new Quaternion()
      .setFromUnitVectors(X_AXIS, curve.getTangentAt(share))
      .multiply(roll);
    return new Matrix4().compose(curve.getPointAt(share), turn, UNIT);
  });
}

export function chainSpots(): Matrix4[] {
  const [point, normal] = hullPoint(HAWSE.x, HAWSE.y, 1);
  const start = new Vector3(...point).addScaledVector(normal, CHAIN.exit);
  const end = start.clone().add(new Vector3(...CHAIN.drop));
  const leave = start
    .clone()
    .addScaledVector(normal, CHAIN.leave[0])
    .add(new Vector3(0, CHAIN.leave[1], 0));
  const hanging = new CubicBezierCurve3(
    start,
    leave,
    end.clone().add(new Vector3(...CHAIN.settle)),
    end,
  );
  return links(hanging);
}

export function lamps(): BufferGeometry {
  const [radius, depth] = LAMP;
  return mergeParts(
    mirrored(LAMPS, 2).map(([x, y, z, fx, fy, fz]) =>
      rod(
        [x, y, z],
        [x + fx * depth, y + fy * depth, z + Math.sign(z) * Math.abs(fz) * depth],
        radius,
      ),
    ),
  );
}

function strip(points: readonly Vec3[]): BufferGeometry {
  let along = 0;
  const distance = points.map(
    (point, at) =>
      (along += at ? Math.hypot(point[0] - points[at - 1][0], point[2] - points[at - 1][2]) : 0),
  );
  const rows = [points.map(([x, y, z]): Vec3 => [x, y + RAIL.height, z]), points];
  return gridSurface(rows, { uv: (row, column) => [distance[column] / RAIL.tile, row] });
}

const loop = (plan: Plan, y: number): Vec3[] => [...plan, plan[0]].map(([x, z]): Vec3 => [x, y, z]);

export function rails(): BufferGeometry {
  const { inset, overlap } = RAIL_EDGE;
  const { first, bridge } = HOUSE;
  const edge = (sign: number) =>
    DECK_STATIONS.filter((x) => x <= BULWARK.rise[0] + overlap).map((x) =>
      onDeck([x, sign * (deckHalf(x) - inset)]),
    );
  const runs = [
    [...edge(-1).reverse(), ...edge(1)],
    loop(chamferedPlan(first.x, first.half - inset, ...first.chamfer), first.y[1]),
    loop(
      chamferedPlan(
        [bridge.x[0], bridge.x[1] + bridge.lean],
        bridge.half + bridge.visor - inset,
        bridge.front,
      ),
      SHIP.bridgeTop,
    ),
  ];
  return mergeParts(runs.map(strip));
}
