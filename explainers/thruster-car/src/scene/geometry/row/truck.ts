import { CylinderGeometry } from 'three';
import type { BufferGeometry } from 'three';
import {
  extrudePlan,
  extrudeProfileAlongX,
  planShape,
  roundedRectShape,
} from '@core/scene/geometry/extrude';
import { mergeParts } from '../../parts/context';
import { smoothCurve } from '../body/curve';
import { HALF_TURN, QUARTER_TURN } from '../turns';
import { loft } from './loft';
import { mirroredBoxes, painted, paintedBox } from './paint';
import { RoundBody, seamStations } from './roundBody';
import { bandSwatch, seamRules } from './rules';
import type { PaintRule, Range } from './rules';
import { boxPoint, endStations, endTaper, mergeStations, spacedStations } from './section';
import type { BoxRow, BoxSection, EndRounding } from './section';
import type { BodyPaint, RowSwatch, SwatchUv } from './swatch';
import { axleWheels, stretchOf, stretched } from './vehicle';
import type { Axle, VehicleModel, VehicleSize } from './vehicle';

const TRUCK_DESIGN: VehicleSize = { length: 8, width: 2.6, height: 4 };

const HALF = TRUCK_DESIGN.length / 2;
const HALF_WIDTH = 1.22;
const SEAM_GAP = 0.005;
const MINIMUM_GAP = 0.04;

const STEER = { radius: 0.52, rim: 0.29, width: 0.3, segments: 14 } as const;
const DRIVE = { ...STEER, width: 0.62, dual: true } as const;
const AXLES: readonly Axle[] = [
  { x: 2.95, z: 1.05, spec: STEER },
  { x: -2.15, z: 0.9, spec: DRIVE },
  { x: -3.4, z: 0.9, spec: DRIVE },
];

const HOOD_SEAM = 1.95;
const HOOD_ROW = {
  shoulder: 0.7,
  side: 1.05,
  lamp: 1.3,
  skirt: 1.9,
  lip: 2.3,
  floor: 2.75,
} as const;
const HOOD_ROWS = [
  0,
  HOOD_ROW.shoulder,
  HOOD_ROW.side,
  HOOD_ROW.lamp,
  QUARTER_TURN,
  HOOD_ROW.skirt,
  HOOD_ROW.lip,
  HOOD_ROW.floor,
  HALF_TURN,
];

const HOOD_RULES: readonly PaintRule<Range>[] = [
  { swatch: 'under', x: [-HALF, HALF], band: [HOOD_ROW.floor, HALF_TURN] },
  { swatch: 'lampHead', x: [3.62, 3.86], band: [HOOD_ROW.lamp, QUARTER_TURN] },
  { swatch: 'lampAmber', x: [3.5, 3.62], band: [HOOD_ROW.lamp, QUARTER_TURN] },
  ...seamRules([HOOD_SEAM], SEAM_GAP, [0, HOOD_ROW.lip] as Range),
];

const HOOD = new RoundBody({
  from: 1.65,
  to: 3.9,
  halfWidth: HALF_WIDTH,
  squareness: { upper: 2.6, lower: 6 },
  front: { depth: 0.3, exponent: 2.2, stations: 5 },
  back: { depth: 0, exponent: 1, stations: 0 },
  top: smoothCurve([
    [1.65, 2.2],
    [2.0, 2.18],
    [2.6, 2.08],
    [3.3, 1.92],
    [3.7, 1.8],
    [3.9, 1.62],
  ]),
  bottom: smoothCurve([
    [1.65, 1.2],
    [2.2, 1.0],
    [3.2, 0.88],
    [3.9, 0.86],
  ]),
  waist: smoothCurve([
    [1.65, 1.55],
    [3.9, 1.25],
  ]),
  arches: [{ x: AXLES[0].x, radius: 0.6, centreY: 0.56, innerZ: 0.85, samples: 7 }],
  rows: HOOD_ROWS,
  rules: HOOD_RULES,
  exact: seamStations([HOOD_SEAM], SEAM_GAP),
  spacing: 0.3,
});

const CAB = {
  from: -1.95,
  to: 1.98,
  bottom: 1.15,
  bottomRadius: 0.05,
  back: { depth: 0.12, exponent: 3, stations: 3 },
  front: { depth: 0.12, exponent: 3, stations: 3 },
  spacing: 0.3,
} as const;

const CAB_TOP = smoothCurve([
  [-1.95, 3.97],
  [-0.2, 3.97],
  [0.5, 3.78],
  [1.15, 3.16],
  [1.4, 3.06],
  [1.55, 2.95],
  [1.98, 2.12],
]);
const CAB_RADIUS = smoothCurve([
  [-1.95, 0.22],
  [-0.2, 0.25],
  [0.6, 0.45],
  [1.2, 0.25],
  [1.98, 0.15],
]);

const WINDOW = { frameTop: 2.92, top: 2.88, bottom: 2.25, frameBottom: 2.2 } as const;

const CAB_ROWS: readonly BoxRow[] = [
  { on: 'top', share: 0 },
  { on: 'top', share: 0.6 },
  { on: 'top', share: 1 },
  { on: 'topCorner', share: 0.5 },
  { on: 'topCorner', share: 1 },
  { on: 'side', y: WINDOW.frameTop },
  { on: 'side', y: WINDOW.top },
  { on: 'side', y: WINDOW.bottom },
  { on: 'side', y: WINDOW.frameBottom },
  { on: 'bottomCorner', share: 0 },
  { on: 'bottomCorner', share: 1 },
  { on: 'bottom', share: 1 },
];

const CAB_BAND = {
  roof: [0, 1, 2],
  frames: [5, 7],
  glass: [6],
  panel: [4, 5, 6, 7, 8],
  lower: [8],
  under: [9, 10],
} as const;

const DOOR: Range = [0.42, 1.5];
const BUNK: Range = [-1.3, -0.75];
const LOCKER: Range = [-1.6, -0.9];
const WINDSCREEN_FROM = 1.56;

const CAB_RULES: readonly PaintRule<readonly number[]>[] = [
  { swatch: 'under', x: [-HALF, HALF], band: CAB_BAND.under },
  { swatch: 'glass', x: [WINDSCREEN_FROM, HALF], band: CAB_BAND.roof },
  { swatch: 'glass', x: [DOOR[0], HALF], band: CAB_BAND.glass },
  { swatch: 'trim', x: [DOOR[0], HALF], band: CAB_BAND.frames },
  { swatch: 'glass', x: BUNK, band: CAB_BAND.glass },
  { swatch: 'trim', x: BUNK, band: CAB_BAND.frames },
  ...seamRules(DOOR, SEAM_GAP, CAB_BAND.panel),
  ...seamRules(LOCKER, SEAM_GAP, CAB_BAND.lower),
];

const GRILLE = {
  shell: { minA: -0.56, minB: 0.82, maxA: 0.56, maxB: 1.86 },
  radius: 0.07,
  from: 3.84,
  to: 3.98,
  insert: { minX: 3.975, maxX: 3.992, minY: 0.9, maxY: 1.78, minZ: -0.48, maxZ: 0.48 },
  bars: [1.06, 1.26, 1.46, 1.66],
  barHeight: 0.026,
  barDepth: 0.006,
} as const;

const FRAME = {
  bumper: { minX: 3.72, maxX: 4, minY: 0.4, maxY: 0.82, minZ: -1.2, maxZ: 1.2 },
  bumperLip: { minX: 3.75, maxX: 3.97, minY: 0.34, maxY: 0.41, minZ: -1.1, maxZ: 1.1 },
  rails: { minX: -3.98, maxX: 3.72, minY: 0.72, maxY: 1.0, minZ: -0.46, maxZ: 0.46 },
  fender: { minX: -3.95, maxX: -1.6, minY: 1.1, maxY: 1.14, minZ: 0.52, maxZ: 1.22 },
  flap: { minX: -3.97, maxX: -3.94, minY: 0.18, maxY: 1.08, minZ: 0.6, maxZ: 1.2 },
  tailLamp: { minX: -3.99, maxX: -3.95, minY: 0.8, maxY: 0.92, minZ: 0.25, maxZ: 0.45 },
  stepLow: { minX: 1.36, maxX: 1.76, minY: 0.52, maxY: 0.57, minZ: 0.92, maxZ: 1.2 },
  stepHigh: { minX: 1.36, maxX: 1.76, minY: 0.86, maxY: 0.91, minZ: 0.95, maxZ: 1.2 },
  mount: { minX: -3.05, maxX: -2.45, minY: 1.0, maxY: 1.2, minZ: -0.4, maxZ: 0.4 },
  visor: { minX: 1.5, maxX: 1.68, minY: 2.97, maxY: 3.02, minZ: -1.05, maxZ: 1.05 },
} as const;

const MIRROR = {
  head: { minX: 1.58, maxX: 1.68, minY: 2.3, maxY: 2.9, minZ: 1.24, maxZ: 1.3 },
  glass: { minX: 1.572, maxX: 1.58, minY: 2.32, maxY: 2.88, minZ: 1.245, maxZ: 1.295 },
  arms: [2.4, 2.8],
  arm: { minX: 1.61, maxX: 1.65, minZ: 1.18, maxZ: 1.25, thickness: 0.04 },
} as const;

const MARKERS = {
  count: 5,
  spread: 0.5,
  halfWidth: 0.04,
  x: [1.6, 1.66],
  y: [3.02, 3.06],
} as const;

const TANK = { radius: 0.32, from: 0.15, to: 1.3, y: 0.75, z: 0.88, segments: 16 } as const;
const STRAPS = { at: [0.35, 1.1], width: 0.05, proud: 0.008 } as const;
const STACK = { radius: 0.075, x: -2.06, z: 1.05, from: 1.3, to: 3.98, segments: 10 } as const;
const FIFTH_WHEEL = {
  x: -2.75,
  radius: 0.45,
  bottom: 1.2,
  top: 1.27,
  throat: 0.32,
  points: 14,
} as const;

function cabSection(x: number): BoxSection {
  const end: EndRounding = x > 0 ? CAB.front : CAB.back;
  const distance = x > 0 ? CAB.to - x : x - CAB.from;
  return {
    halfWidth: HALF_WIDTH * endTaper(distance, end),
    top: CAB_TOP(x),
    bottom: CAB.bottom,
    topRadius: CAB_RADIUS(x),
    bottomRadius: CAB.bottomRadius,
  };
}

function cab(paint: BodyPaint, uv: SwatchUv): BufferGeometry {
  const exact = [...DOOR, ...LOCKER].flatMap((x) => [x - SEAM_GAP, x + SEAM_GAP]);
  const stations = mergeStations(
    [
      ...endStations(CAB.from, 1, CAB.back),
      ...endStations(CAB.to, -1, CAB.front),
      ...spacedStations(CAB.from + CAB.back.depth, CAB.to - CAB.front.depth, CAB.spacing),
      ...BUNK,
      WINDSCREEN_FROM,
    ],
    exact,
    MINIMUM_GAP,
  );
  return loft({
    stations,
    ring: (x) => CAB_ROWS.map((row) => boxPoint(cabSection(x), row)),
    uvAt: (x, band) => uv(bandSwatch(CAB_RULES, x, band, paint)),
  });
}

function grille(uv: SwatchUv): BufferGeometry[] {
  const shell = extrudeProfileAlongX(
    roundedRectShape(GRILLE.shell, GRILLE.radius),
    GRILLE.from,
    GRILLE.to,
  );
  const bars = GRILLE.bars.map((y) =>
    paintedBox(
      {
        ...GRILLE.insert,
        minX: GRILLE.insert.maxX - GRILLE.barDepth,
        maxX: GRILLE.insert.maxX + GRILLE.barDepth,
        minY: y,
        maxY: y + GRILLE.barHeight,
      },
      'chrome',
      uv,
    ),
  );
  return [painted(shell, 'chrome', uv), paintedBox(GRILLE.insert, 'grille', uv), ...bars];
}

function framePieces(paint: BodyPaint, uv: SwatchUv): BufferGeometry[] {
  const mirrored: readonly [keyof typeof FRAME, RowSwatch][] = [
    ['fender', 'trim'],
    ['flap', 'trim'],
    ['tailLamp', 'lampRear'],
    ['stepLow', 'trim'],
    ['stepHigh', 'trim'],
  ];
  return [
    paintedBox(FRAME.bumper, 'rim', uv),
    paintedBox(FRAME.bumperLip, 'trim', uv),
    paintedBox(FRAME.rails, 'under', uv),
    paintedBox(FRAME.mount, 'under', uv),
    paintedBox(FRAME.visor, paint, uv),
    ...mirrored.flatMap(([piece, swatch]) => mirroredBoxes(FRAME[piece], swatch, uv)),
  ];
}

function mirrors(uv: SwatchUv): BufferGeometry[] {
  const arms = MIRROR.arms.flatMap((y) =>
    mirroredBoxes(
      { ...MIRROR.arm, minY: y - MIRROR.arm.thickness / 2, maxY: y + MIRROR.arm.thickness / 2 },
      'chrome',
      uv,
    ),
  );
  return [
    ...mirroredBoxes(MIRROR.head, 'trim', uv),
    ...mirroredBoxes(MIRROR.glass, 'glass', uv),
    ...arms,
  ];
}

function markers(uv: SwatchUv): BufferGeometry[] {
  const middle = (MARKERS.count - 1) / 2;
  return Array.from({ length: MARKERS.count }, (_, index) => {
    const z = ((index - middle) / middle) * MARKERS.spread;
    return paintedBox(
      {
        minX: MARKERS.x[0],
        maxX: MARKERS.x[1],
        minY: MARKERS.y[0],
        maxY: MARKERS.y[1],
        minZ: z - MARKERS.halfWidth,
        maxZ: z + MARKERS.halfWidth,
      },
      'lampAmber',
      uv,
    );
  });
}

function cylinderAlongX(radius: number, from: number, to: number, segments: number, open = false) {
  return new CylinderGeometry(radius, radius, to - from, segments, 1, open)
    .rotateZ(QUARTER_TURN)
    .translate((from + to) / 2, 0, 0);
}

function tanks(uv: SwatchUv): BufferGeometry[] {
  return [1, -1].flatMap((side) => {
    const place = (geometry: BufferGeometry) => geometry.translate(0, TANK.y, side * TANK.z);
    const shell = place(cylinderAlongX(TANK.radius, TANK.from, TANK.to, TANK.segments));
    const straps = STRAPS.at.map((x) =>
      painted(
        place(cylinderAlongX(TANK.radius + STRAPS.proud, x, x + STRAPS.width, TANK.segments, true)),
        'under',
        uv,
      ),
    );
    return [painted(shell, 'chrome', uv), ...straps];
  });
}

function stacks(uv: SwatchUv): BufferGeometry[] {
  return [1, -1].map((side) =>
    painted(
      new CylinderGeometry(
        STACK.radius,
        STACK.radius,
        STACK.to - STACK.from,
        STACK.segments,
        1,
        true,
      ).translate(STACK.x, (STACK.from + STACK.to) / 2, side * STACK.z),
      'chrome',
      uv,
    ),
  );
}

function fifthWheel(uv: SwatchUv): BufferGeometry {
  const { radius, throat, points } = FIFTH_WHEEL;
  const half = Math.asin(throat / 2 / radius);
  const rim = Array.from({ length: points + 1 }, (_, step) => {
    const angle = -HALF_TURN + half + (step / points) * (2 * HALF_TURN - 2 * half);
    return { x: FIFTH_WHEEL.x + radius * Math.cos(angle), z: radius * Math.sin(angle) };
  });
  const shape = planShape([...rim, { x: FIFTH_WHEEL.x, z: 0 }]);
  return painted(extrudePlan(shape, FIFTH_WHEEL.bottom, FIFTH_WHEEL.top), 'steel', uv);
}

function truckGeometry(size: VehicleSize, paint: BodyPaint, uv: SwatchUv): BufferGeometry {
  const stretch = stretchOf(size, TRUCK_DESIGN);
  const body = stretched(
    [
      HOOD.geometry(paint, uv),
      cab(paint, uv),
      ...grille(uv),
      ...framePieces(paint, uv),
      ...mirrors(uv),
      ...markers(uv),
      ...tanks(uv),
      ...stacks(uv),
      fifthWheel(uv),
    ],
    stretch,
  );
  return mergeParts([body, ...axleWheels(AXLES, stretch, uv)]);
}

export const TRUCK_MODEL: VehicleModel = {
  design: TRUCK_DESIGN,
  axles: AXLES,
  geometry: truckGeometry,
};
