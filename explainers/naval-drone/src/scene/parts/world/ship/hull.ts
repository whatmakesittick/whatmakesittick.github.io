import { Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { smoothstep } from '@core/math';
import { SHIP } from '../../../../model/layout';
import { mergeSorted, monotoneCubic, spread } from '../../../geometry/curves';
import { gridSurface, mirrorZ, orientFrom } from '../../../geometry/surface';
import type { Vec3 } from '../../../geometry/surface';
import { mergeParts } from '../../context';
import type { Plan } from './kit';
import { deckUv, hullUv } from './maps';

export const STERN = -SHIP.length / 2;
const BOW = SHIP.length / 2;
const HALF = SHIP.beam / 2;

const LINES = {
  keel: [
    [-55, -1.1],
    [-46, -2.4],
    [-36, -3.6],
    [-28, -SHIP.draft],
    [38, -SHIP.draft],
    [43, -3.55],
    [46.5, -2.5],
    [48.9, -1.1],
    [50.3, 0],
  ],
  deck: [
    [-55, 6.2],
    [-42, 6.03],
    [-30, SHIP.deck],
    [12, SHIP.deck],
    [24, 6.12],
    [32, 6.45],
    [40, 6.95],
    [48, 7.4],
    [55, 7.75],
  ],
  waterline: [
    [-55, 5.6],
    [-46, 6.55],
    [-34, 6.95],
    [-24, HALF],
    [8, HALF],
    [18, 6.85],
    [27, 6.2],
    [35, 4.9],
    [41, 3.3],
    [46, 1.75],
    [49, 0.75],
    [50.3, 0],
  ],
  top: [
    [-55, 6.2],
    [-45, 6.85],
    [-32, HALF],
    [20, HALF],
    [30, 6.75],
    [38, 6.1],
    [44, 5],
    [49, 3.2],
    [52, 1.7],
    [54, 0.7],
    [55, 0],
  ],
  fullness: [
    [-55, 4],
    [-40, 5],
    [-26, 7],
    [8, 7],
    [22, 4.5],
    [34, 2.6],
    [42, 1.9],
    [48, 1.5],
    [50.3, 1.3],
  ],
  flare: [
    [-55, 1.3],
    [0, 1.5],
    [30, 1.6],
    [45, 1.8],
  ],
} as const satisfies Record<string, Plan>;

export const BULWARK = { height: 1.1, rise: [33, 39.5], thickness: 0.14 } as const;

const SHAPE = {
  camber: 0.1,
  knuckle: { drop: 1.3, share: 0.8, fade: 0.3 },
  rake: 0.9,
  rakeFade: 6,
  stations: [
    [-55, -43, 4],
    [-43, 28, 16],
    [28, 44, 8],
    [44, 50, 8],
    [50, 55, 10],
  ],
  rows: { lower: 10, below: 5, above: 3, rail: 2, deck: 10, transom: 8 },
  sink: 0.06,
  bisect: 30,
  step: 0.05,
} as const;

const spline = (knots: Plan) =>
  monotoneCubic(
    knots.map(([x]) => x),
    knots.map(([, value]) => value),
  );
const deckLine = spline(LINES.deck);
const waterline = spline(LINES.waterline);
const topBreadth = spline(LINES.top);
const fullness = spline(LINES.fullness);
const flare = spline(LINES.flare);

export const deckY = (x: number) => deckLine(x);
export const deckEdgeY = (x: number) => deckLine(x) - SHAPE.camber;
export const topY = (x: number) => deckEdgeY(x) + BULWARK.height * smoothstep(x, ...BULWARK.rise);
const keelLine = spline([...LINES.keel, [BOW, topY(BOW)]]);
const keelY = (x: number) => Math.min(keelLine(x), topY(x));

function upperZ(x: number, y: number, floor: number): number {
  const top = topY(x);
  if (top <= floor) return 0;
  const base = waterline(x);
  const reach = topBreadth(x) - base;
  const share = Math.min(1, (y - floor) / (top - floor));
  const knuckle = Math.max(0, (deckEdgeY(x) - SHAPE.knuckle.drop - floor) / (top - floor));
  const below = SHAPE.knuckle.share * smoothstep(knuckle, 0, SHAPE.knuckle.fade);
  if (share <= knuckle) return base + reach * below * (share / knuckle) ** flare(x);
  return base + reach * (below + ((1 - below) * (share - knuckle)) / (1 - knuckle));
}

export function sectionZ(x: number, y: number): number {
  const keel = keelY(x);
  const floor = Math.max(0, keel);
  if (y <= keel) return 0;
  if (y > floor) return upperZ(x, y, floor);
  const power = fullness(x);
  return waterline(x) * Math.max(0, 1 - ((floor - y) / (floor - keel)) ** power) ** (1 / power);
}

export const deckHalf = (x: number) => sectionZ(x, deckEdgeY(x));

export function deckAt(x: number, z: number): number {
  const half = deckHalf(x);
  return deckY(x) - SHAPE.camber * (half > 0 ? Math.min(1, (z / half) ** 2) : 1);
}

export const edgeSlope = (x: number) =>
  (deckHalf(x + SHAPE.step) - deckHalf(x - SHAPE.step)) / (2 * SHAPE.step);

export function hullPoint(x: number, y: number, side: number): [Vec3, Vector3] {
  const along = (dx: number, dy: number) =>
    (sectionZ(x + dx, y + dy) - sectionZ(x - dx, y - dy)) / (2 * SHAPE.step);
  const normal = new Vector3(-along(SHAPE.step, 0), -along(0, SHAPE.step), side).normalize();
  return [[x, y, side * sectionZ(x, y)], normal];
}

function deckTip(): number {
  let low: number = LINES.waterline[LINES.waterline.length - 1][0];
  let high: number = BOW;
  for (let step = 0; step < SHAPE.bisect; step += 1) {
    const middle = (low + high) / 2;
    if (keelY(middle) < deckEdgeY(middle)) low = middle;
    else high = middle;
  }
  return low;
}

const TIP = deckTip();
const STATIONS = mergeSorted(
  SHAPE.stations.flatMap(([from, to, steps]) => spread(from, to, steps)),
  SHAPE.step,
);
export const DECK_STATIONS = [...STATIONS.filter((x) => x < TIP - SHAPE.step), TIP];
const KNUCKLE_ROW = SHAPE.rows.lower + SHAPE.rows.below;

function section(x: number): Vec3[] {
  const { lower, below, above, rail } = SHAPE.rows;
  const keel = keelY(x);
  const floor = Math.max(0, keel);
  const power = fullness(x);
  const deck = Math.max(deckEdgeY(x), floor);
  const knuckle = Math.min(Math.max(deckEdgeY(x) - SHAPE.knuckle.drop, floor), deck);
  const bottom = spread(0, Math.PI / 2, lower).map((angle): Vec3 => [
    x,
    floor - (floor - keel) * Math.cos(angle) ** (2 / power),
    waterline(x) * Math.sin(angle) ** (2 / power),
  ]);
  const heights = [
    ...spread(floor, knuckle, below).slice(1),
    ...spread(knuckle, deck, above).slice(1),
    ...spread(deck, Math.max(topY(x), deck), rail).slice(1),
  ];
  const rake = SHAPE.rake * Math.max(0, 1 - (x - STERN) / SHAPE.rakeFade);
  return [...bottom, ...heights.map((y): Vec3 => [x, y, sectionZ(x, y)])].map(([, y, z]) => [
    x + (rake * Math.max(0, deckEdgeY(x) - y)) / (deckEdgeY(x) - keel),
    y,
    z,
  ]);
}

function surface(
  rows: readonly (readonly Vec3[])[],
  uv: (point: Vec3) => readonly [number, number],
  away: Vec3,
) {
  return orientFrom(gridSurface(rows, { uv: (row, column) => uv(rows[row][column]) }), away);
}

const columnsToRows = (columns: readonly Vec3[][]) =>
  columns[0].map((_, row) => columns.map((column) => column[row]));
const sides = (geometry: BufferGeometry) => [geometry, mirrorZ(geometry)];
const sideUv = ([x, y]: Vec3) => hullUv(x, y);

function shell(): BufferGeometry[] {
  const rows = columnsToRows(STATIONS.map(section));
  const inside: Vec3 = [0, 1, 0];
  const across = spread(-1, 1, SHAPE.rows.transom);
  const half = deckHalf(STERN);
  const transom = section(STERN).map(([x, y, z]) => across.map((share): Vec3 => [x, y, share * z]));
  transom.push(across.map((share): Vec3 => [STERN, deckAt(STERN, share * half), share * half]));
  return [
    ...sides(surface(rows.slice(0, KNUCKLE_ROW + 1), sideUv, inside)),
    ...sides(surface(rows.slice(KNUCKLE_ROW), sideUv, inside)),
    surface(transom, ([, y, z]) => hullUv(STERN + z + HALF, y), inside),
  ];
}

function bulwark(): BufferGeometry[] {
  const stations = DECK_STATIONS.filter((x) => x >= BULWARK.rise[0]);
  const inner = (x: number, y: number) =>
    Math.max(sectionZ(x, y) - BULWARK.thickness, sectionZ(x, y) / 2);
  const face = stations.map((x) =>
    spread(deckEdgeY(x), topY(x), SHAPE.rows.rail).map((y, at): Vec3 => [
      x,
      at ? y : deckAt(x, inner(x, y)) - SHAPE.sink,
      inner(x, y),
    ]),
  );
  const cap = stations.map((x): Vec3[] => [
    [x, topY(x), sectionZ(x, topY(x))],
    [x, topY(x), inner(x, topY(x))],
  ]);
  return [
    ...sides(surface(columnsToRows(face), sideUv, [BOW, deckY(BOW), SHIP.length])),
    ...sides(
      surface(columnsToRows(cap), ([x, y]) => hullUv(x, y - BULWARK.height / 2), [
        0,
        -SHIP.length,
        0,
      ]),
    ),
  ];
}

function deck(): BufferGeometry {
  const rows = spread(-1, 1, SHAPE.rows.deck).map((share) =>
    DECK_STATIONS.map((x): Vec3 => [
      x,
      deckY(x) - SHAPE.camber * share * share,
      share * deckHalf(x),
    ]),
  );
  return surface(rows, ([x, , z]) => deckUv(x, z), [0, -SHIP.length, 0]);
}

export function buildHull(): { shell: BufferGeometry; deck: BufferGeometry } {
  return { shell: mergeParts([...shell(), ...bulwark()]), deck: deck() };
}
