import { Group, Path } from 'three';
import type { BufferGeometry, ColorRepresentation } from 'three';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HULL, MOORING, SEGMENTS } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { merge, mergePainted, paintByNormal } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { fairleadPoints } from './hull';

type Painted = readonly [BufferGeometry, ColorRepresentation];

interface HouseSpec {
  bounds: BoxBounds;
  color: ColorRepresentation;
}

const HALF = HULL.deck.size / 2;
const TOP = HULL.deck.top;
const RAIL_INSET = 0.3;
const WINDOW = { band: 0.9, fromTop: 1.3, inset: 0.08 } as const;
const STACK = { radius: 0.55, height: 4.5 } as const;

const HOUSES: readonly HouseSpec[] = [
  {
    bounds: { minX: -4, maxX: 12, minY: TOP, maxY: TOP + 4.5, minZ: -38, maxZ: -21 },
    color: PAINT.cream,
  },
  {
    bounds: { minX: 16, maxX: 38, minY: TOP, maxY: TOP + 7, minZ: -38, maxZ: -15 },
    color: PAINT.hullGrey,
  },
  {
    bounds: { minX: 10.5, maxX: 16, minY: TOP, maxY: TOP + 6.5, minZ: -12, maxZ: -1 },
    color: PAINT.cream,
  },
  {
    bounds: { minX: -38, maxX: -31.9, minY: TOP, maxY: TOP + 2.6, minZ: 10, maxZ: 12.4 },
    color: PAINT.containerBlue,
  },
  {
    bounds: { minX: -38, maxX: -31.9, minY: TOP + 2.6, maxY: TOP + 5.2, minZ: 10, maxZ: 12.4 },
    color: PAINT.containerRed,
  },
  {
    bounds: { minX: -38, maxX: -31.9, minY: TOP, maxY: TOP + 2.6, minZ: 13, maxZ: 15.4 },
    color: PAINT.containerGreen,
  },
  {
    bounds: { minX: -30.5, maxX: -24.4, minY: TOP, maxY: TOP + 2.6, minZ: 10, maxZ: 12.4 },
    color: PAINT.white,
  },
  {
    bounds: { minX: -30.5, maxX: -24.4, minY: TOP, maxY: TOP + 2.6, minZ: 13, maxZ: 15.4 },
    color: PAINT.containerBlue,
  },
  {
    bounds: { minX: -22, maxX: -15.9, minY: TOP, maxY: TOP + 2.6, minZ: 16, maxZ: 18.4 },
    color: PAINT.orange,
  },
];

const STACKS: readonly Point[] = [
  [20, TOP + 7, -35],
  [23, TOP + 7, -35],
  [26, TOP + 7, -35],
  [29, TOP + 7, -35],
];

function deckOutline() {
  const outline = planShape([
    { x: -HALF, z: -HALF },
    { x: HALF, z: -HALF },
    { x: HALF, z: HALF },
    { x: -HALF, z: HALF },
  ]);
  const { moonpoolX, moonpoolZ } = HULL.deck;
  const hole = new Path();
  hole.moveTo(-moonpoolX / 2, -moonpoolZ / 2);
  hole.lineTo(-moonpoolX / 2, moonpoolZ / 2);
  hole.lineTo(moonpoolX / 2, moonpoolZ / 2);
  hole.lineTo(moonpoolX / 2, -moonpoolZ / 2);
  hole.lineTo(-moonpoolX / 2, -moonpoolZ / 2);
  outline.holes.push(hole);
  return outline;
}

function deckBox(): BufferGeometry {
  const trimFrom = TOP - HULL.deck.trim;
  const hull = paintByNormal(extrudePlan(deckOutline(), HULL.deck.underside, trimFrom), {
    top: PAINT.deck,
    side: PAINT.hullGrey,
    bottom: PAINT.trim,
  });
  const trim = paintByNormal(extrudePlan(deckOutline(), trimFrom, TOP), {
    top: PAINT.deck,
    side: PAINT.deckEdge,
    bottom: PAINT.trim,
  });
  return merge([hull, trim]);
}

function railSide(from: Point, to: Point): BufferGeometry[] {
  const { height, rail, post, spacing } = HULL.railing;
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const count = Math.max(1, Math.round(length / spacing));
  const lift = (point: Point, y: number): Point => [point[0], y, point[2]];
  const posts = Array.from({ length: count + 1 }, (_, index) => {
    const share = index / count;
    const at: Point = [
      from[0] + (to[0] - from[0]) * share,
      TOP,
      from[2] + (to[2] - from[2]) * share,
    ];
    return barGeometry(at, lift(at, TOP + height), post);
  });
  return [
    barGeometry(lift(from, TOP + height), lift(to, TOP + height), rail),
    barGeometry(lift(from, TOP + height / 2), lift(to, TOP + height / 2), rail),
    ...posts,
  ];
}

function railings(): BufferGeometry {
  const edge = HALF - RAIL_INSET;
  const corners: Point[] = [
    [-edge, TOP, -edge],
    [edge, TOP, -edge],
    [edge, TOP, edge],
    [-edge, TOP, edge],
  ];
  return merge(corners.flatMap((corner, index) => railSide(corner, corners[(index + 1) % 4])));
}

function windlasses(): Painted[] {
  const size = MOORING.windlassSize;
  return fairleadPoints().map(([x, , z]) => {
    const inward = (value: number) => value - Math.sign(value) * size;
    const geometry = box({
      minX: Math.min(inward(x), x),
      maxX: Math.max(inward(x), x),
      minY: TOP,
      maxY: TOP + size,
      minZ: Math.min(inward(z), z),
      maxZ: Math.max(inward(z), z),
    });
    return [geometry, PAINT.darkSteel] as const;
  });
}

function windowBand(bounds: BoxBounds): BufferGeometry {
  return box({
    minX: bounds.minX - WINDOW.inset,
    maxX: bounds.maxX + WINDOW.inset,
    minY: bounds.maxY - WINDOW.fromTop - WINDOW.band,
    maxY: bounds.maxY - WINDOW.fromTop,
    minZ: bounds.minZ - WINDOW.inset,
    maxZ: bounds.maxZ + WINDOW.inset,
  });
}

function houses(): Painted[] {
  const bodies = HOUSES.map(({ bounds, color }) => [box(bounds), color] as const);
  const windows = HOUSES.slice(0, 3).map(
    ({ bounds }) => [windowBand(bounds), PAINT.glass] as const,
  );
  const stacks = STACKS.map(([x, y, z]) => {
    const stack = rodGeometry([x, y, z], [x, y + STACK.height, z], STACK.radius, SEGMENTS.pipe);
    return [stack, PAINT.darkSteel] as const;
  });
  return [...bodies, ...windows, ...stacks];
}

export function createDeck(context: PartContext): Group {
  const object = new Group();
  const structure = mergePainted([...houses(), ...windlasses(), [railings(), PAINT.safetyYellow]]);
  object.add(partMesh(context, merge([deckBox(), structure]), STRUCTURE_GROUP, 'painted'));
  return object;
}
