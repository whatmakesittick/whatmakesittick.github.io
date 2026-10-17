import type { BufferGeometry } from 'three';
import { mergeParts } from '../../parts/context';
import { smoothCurve } from '../body/curve';
import { HALF_TURN, QUARTER_TURN } from '../gear/lathe';
import type { SectionPoint } from './loft';
import { mirroredBoxes, paintedBox } from './paint';
import {
  CABIN_BAND,
  ROUND_ROW,
  ROUND_ROWS,
  RoundBody,
  SEAM_BAND,
  doorHandles,
  seamStations,
} from './roundBody';
import type { CabinSpec } from './roundBody';
import { seamRules } from './rules';
import type { PaintRule, Range } from './rules';
import type { BodyPaint, SwatchUv } from './swatch';
import { axleWheels, stretchOf, stretched } from './vehicle';
import type { Axle, VehicleModel, VehicleSize } from './vehicle';

const CAR_DESIGN: VehicleSize = { length: 4.6, width: 1.85, height: 1.45 };

const HALF = CAR_DESIGN.length / 2;
const SEAM_GAP = 0.004;
const ALL: Range = [-HALF, HALF];

const WHEEL_SPEC = { radius: 0.32, rim: 0.215, width: 0.215, segments: 14 } as const;
const AXLES: readonly Axle[] = [1.38, -1.36].map((x) => ({ x, z: 0.73, spec: WHEEL_SPEC }));

const SEAMS = { doors: [0.98, -0.06, -0.95], bonnet: 1.07, boot: -1.62 } as const;

const BODY_RULES: readonly PaintRule<Range>[] = [
  { swatch: 'under', x: ALL, band: [ROUND_ROW.floorEdge, HALF_TURN] },
  { swatch: 'lampHead', x: [1.97, 2.28], band: [ROUND_ROW.lamp, QUARTER_TURN] },
  { swatch: 'lampRear', x: [-2.29, -2.02], band: [ROUND_ROW.lamp, QUARTER_TURN] },
  { swatch: 'grille', x: [2.2, HALF], band: [ROUND_ROW.sill, ROUND_ROW.skirt] },
  { swatch: 'trim', x: ALL, band: [ROUND_ROW.skirt, ROUND_ROW.floorEdge] },
  ...seamRules(SEAMS.doors, SEAM_GAP, [ROUND_ROW.seam, ROUND_ROW.skirt] as Range),
  ...seamRules([SEAMS.bonnet, SEAMS.boot], SEAM_GAP, [0, ROUND_ROW.seam] as Range),
  { swatch: 'seam', x: [SEAMS.bonnet, 2.14], band: SEAM_BAND },
  { swatch: 'seam', x: [-2.16, SEAMS.boot], band: SEAM_BAND },
];

const BODY = new RoundBody({
  from: -HALF,
  to: HALF,
  halfWidth: 0.855,
  squareness: { upper: 4.5, lower: 6 },
  front: { depth: 0.45, exponent: 2.4, stations: 6 },
  back: { depth: 0.32, exponent: 2.8, stations: 5 },
  top: smoothCurve([
    [-2.3, 0.78],
    [-2.26, 0.9],
    [-2.18, 0.965],
    [-1.95, 0.99],
    [-1.6, 1.0],
    [0.5, 0.99],
    [1.05, 0.95],
    [1.6, 0.885],
    [2.0, 0.8],
    [2.18, 0.74],
    [2.3, 0.62],
  ]),
  bottom: smoothCurve([
    [-2.3, 0.36],
    [-2.22, 0.27],
    [-2.05, 0.2],
    [-1.85, 0.175],
    [1.85, 0.175],
    [2.12, 0.21],
    [2.25, 0.26],
    [2.3, 0.32],
  ]),
  waist: smoothCurve([
    [-2.3, 0.6],
    [-1.8, 0.64],
    [1.8, 0.62],
    [2.3, 0.5],
  ]),
  arches: AXLES.map((axle) => ({
    x: axle.x,
    radius: 0.375,
    centreY: 0.34,
    innerZ: 0.6,
    samples: 6,
  })),
  rows: ROUND_ROWS,
  rules: BODY_RULES,
  exact: seamStations([...SEAMS.doors, SEAMS.bonnet, SEAMS.boot], SEAM_GAP),
  spacing: 0.34,
});

const CABIN_ROWS: readonly SectionPoint[] = [
  [0, 1],
  [0.42, 0.985],
  [0.79, 0.935],
  [0.875, 0.85],
  [0.892, 0.81],
  [0.9, 0.775],
  [0.985, 0.07],
  [1, 0],
];

const SIDE_WINDOW: Range = [-0.98, 1.01];

const CABIN: CabinSpec = {
  stations: [
    -1.6, -1.47, -1.32, -1.15, -0.98, -0.8, -0.55, -0.3, -0.11, -0.01, 0.05, 0.2, 0.38, 0.56, 0.75,
    0.92, 1.08,
  ],
  rows: CABIN_ROWS,
  roof: smoothCurve([
    [-1.6, 0.9],
    [-1.45, 1.06],
    [-1.25, 1.2],
    [-1.0, 1.33],
    [-0.75, 1.415],
    [-0.4, 1.445],
    [0, 1.45],
    [0.22, 1.42],
    [0.5, 1.3],
    [0.8, 1.12],
    [1.08, 0.9],
  ]),
  plan: smoothCurve([
    [-1.6, 0.9],
    [-1.0, 0.96],
    [0.3, 1],
    [1.08, 0.985],
  ]),
  inset: 0.085,
  rules: [
    { swatch: 'glass', x: [0.22, HALF], band: CABIN_BAND.top },
    { swatch: 'glass', x: [-HALF, -0.75], band: CABIN_BAND.top },
    { swatch: 'trim', x: SIDE_WINDOW, band: [...CABIN_BAND.frame, ...CABIN_BAND.belt] },
    { swatch: 'trim', x: [-0.11, -0.01], band: CABIN_BAND.glass },
    { swatch: 'glass', x: SIDE_WINDOW, band: CABIN_BAND.glass },
  ],
};

const MIRROR = {
  housing: { minX: 0.88, maxX: 1.02, minY: 0.94, maxY: 1.03, minZ: 0.8, maxZ: 0.925 },
  glass: { minX: 0.874, maxX: 0.882, minY: 0.95, maxY: 1.02, minZ: 0.81, maxZ: 0.915 },
  arm: { minX: 0.94, maxX: 1.0, minY: 0.935, maxY: 0.965, minZ: 0.74, maxZ: 0.81 },
} as const;

const HANDLES = [0.45, -0.65];
const HANDLE_Y = 0.84;
const PLATE = { halfWidth: 0.26, height: 0.11, depth: 0.014 } as const;
const PLATES = [
  { x: HALF - 0.012, y: 0.3 },
  { x: -HALF + 0.005, y: 0.62 },
] as const;

function mirrors(paint: BodyPaint, uv: SwatchUv): BufferGeometry[] {
  return [
    ...mirroredBoxes(MIRROR.housing, paint, uv),
    ...mirroredBoxes(MIRROR.glass, 'glass', uv),
    ...mirroredBoxes(MIRROR.arm, 'trim', uv),
  ];
}

function plates(uv: SwatchUv): BufferGeometry[] {
  return PLATES.map(({ x, y }) =>
    paintedBox(
      {
        minX: x - PLATE.depth / 2,
        maxX: x + PLATE.depth / 2,
        minY: y,
        maxY: y + PLATE.height,
        minZ: -PLATE.halfWidth,
        maxZ: PLATE.halfWidth,
      },
      'plate',
      uv,
    ),
  );
}

function carGeometry(size: VehicleSize, paint: BodyPaint, uv: SwatchUv): BufferGeometry {
  const stretch = stretchOf(size, CAR_DESIGN);
  const body = stretched(
    [
      BODY.geometry(paint, uv),
      BODY.cabin(CABIN, paint, uv),
      ...mirrors(paint, uv),
      ...doorHandles(BODY, HANDLES, HANDLE_Y, uv),
      ...plates(uv),
    ],
    stretch,
  );
  return mergeParts([body, ...axleWheels(AXLES, stretch, uv)]);
}

export const CAR_MODEL: VehicleModel = { design: CAR_DESIGN, axles: AXLES, geometry: carGeometry };
