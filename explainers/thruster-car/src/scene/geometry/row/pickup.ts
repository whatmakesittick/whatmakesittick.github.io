import type { BufferGeometry } from 'three';
import { mergeParts } from '../../parts/context';
import { smoothCurve } from '../body/curve';
import { HALF_TURN, QUARTER_TURN } from '../gear/lathe';
import { loft } from './loft';
import type { SectionPoint } from './loft';
import { mirroredBoxes, paintedBox } from './paint';
import {
  CABIN_BAND,
  MINIMUM_GAP,
  ROUND_ROW,
  ROUND_ROWS,
  RoundBody,
  SEAM_BAND,
  archStations,
  doorHandles,
  liftUnderArches,
  seamStations,
} from './roundBody';
import type { ArchSpec, CabinSpec } from './roundBody';
import { seamRules } from './rules';
import type { PaintRule, Range } from './rules';
import { mergeStations, spacedStations } from './section';
import type { BodyPaint, RowSwatch, SwatchUv } from './swatch';
import { axleWheels, stretchOf, stretched } from './vehicle';
import type { Axle, VehicleModel, VehicleSize } from './vehicle';

const PICKUP_DESIGN: VehicleSize = { length: 3.4, width: 2, height: 1.9 };

const HALF = PICKUP_DESIGN.length / 2;
const HALF_WIDTH = 0.91;
const SEAM_GAP = 0.004;
const ALL: Range = [-HALF, HALF];

const WHEEL_SPEC = { radius: 0.36, rim: 0.22, width: 0.235, segments: 14 } as const;
const AXLES: readonly Axle[] = [1.05, -1.1].map((x) => ({ x, z: 0.77, spec: WHEEL_SPEC }));
const ARCHES: readonly ArchSpec[] = AXLES.map((axle) => ({
  x: axle.x,
  radius: 0.42,
  centreY: 0.4,
  innerZ: 0.62,
  samples: 7,
}));

const SEAMS = { doors: [0.93, -0.36], bonnet: 1.0 } as const;

const FRONT_RULES: readonly PaintRule<Range>[] = [
  { swatch: 'under', x: ALL, band: [ROUND_ROW.floorEdge, HALF_TURN] },
  { swatch: 'lampHead', x: [1.5, HALF], band: [ROUND_ROW.lamp, QUARTER_TURN] },
  { swatch: 'grille', x: [1.62, HALF], band: [0, ROUND_ROW.lamp] },
  { swatch: 'trim', x: ALL, band: [ROUND_ROW.skirt, ROUND_ROW.floorEdge] },
  ...seamRules(SEAMS.doors, SEAM_GAP, [ROUND_ROW.seam, ROUND_ROW.skirt] as Range),
  ...seamRules([SEAMS.bonnet], SEAM_GAP, [0, ROUND_ROW.seam] as Range),
  { swatch: 'seam', x: [SEAMS.bonnet, 1.6], band: SEAM_BAND },
];

const FRONT = new RoundBody({
  from: -0.47,
  to: HALF,
  halfWidth: HALF_WIDTH,
  squareness: { upper: 5, lower: 7 },
  front: { depth: 0.22, exponent: 3.2, stations: 5 },
  back: { depth: 0.05, exponent: 4, stations: 2 },
  top: smoothCurve([
    [-0.47, 1.12],
    [0.9, 1.1],
    [1.5, 1.04],
    [1.64, 0.98],
    [1.7, 0.86],
  ]),
  bottom: smoothCurve([
    [-0.47, 0.36],
    [1.4, 0.36],
    [1.62, 0.38],
    [1.7, 0.46],
  ]),
  waist: smoothCurve([
    [-0.47, 0.78],
    [1.7, 0.72],
  ]),
  arches: ARCHES.slice(0, 1),
  rows: ROUND_ROWS,
  rules: FRONT_RULES,
  exact: seamStations([...SEAMS.doors, SEAMS.bonnet], SEAM_GAP),
  spacing: 0.3,
});

const CAB_BACK = -0.42;
const DOOR_WINDOW: Range = [-0.3, 0.99];

const CABIN: CabinSpec = {
  stations: [CAB_BACK, -0.4, -0.3, -0.1, 0.15, 0.38, 0.52, 0.66, 0.82, 0.98],
  rows: [
    [0, 1],
    [0.5, 0.99],
    [0.84, 0.955],
    [0.9, 0.9],
    [0.915, 0.86],
    [0.92, 0.83],
    [0.99, 0.06],
    [1, 0],
  ],
  roof: smoothCurve([
    [CAB_BACK, 1.0],
    [-0.4, 1.86],
    [-0.3, 1.895],
    [0.2, 1.9],
    [0.45, 1.87],
    [0.6, 1.76],
    [0.98, 1.12],
  ]),
  plan: smoothCurve([
    [CAB_BACK, 0.97],
    [0.98, 0.99],
  ]),
  inset: 0.07,
  rules: [
    { swatch: 'glass', x: [0.5, HALF], band: CABIN_BAND.top },
    { swatch: 'trim', x: DOOR_WINDOW, band: [...CABIN_BAND.frame, ...CABIN_BAND.belt] },
    { swatch: 'glass', x: DOOR_WINDOW, band: CABIN_BAND.glass },
  ],
};

const BED = {
  from: -1.65,
  to: -0.5,
  halfWidth: HALF_WIDTH + 0.003,
  floor: 0.84,
  rail: 1.12,
  wall: 0.05,
  railRadius: 0.02,
  waist: 0.78,
  bottom: 0.42,
  bottomRadius: 0.05,
  spacing: 0.25,
} as const;

const BED_SWATCHES: readonly (RowSwatch | 'paint')[] = [
  'trim',
  'trim',
  'paint',
  'paint',
  'paint',
  'paint',
  'under',
  'under',
];

const PIECES = {
  bulkhead: {
    minX: -0.53,
    maxX: BED.to,
    minY: BED.bottom,
    maxY: BED.rail,
    minZ: -BED.halfWidth,
    maxZ: BED.halfWidth,
  },
  tailgate: {
    minX: -1.67,
    maxX: -1.63,
    minY: 0.44,
    maxY: 1.11,
    minZ: -BED.halfWidth,
    maxZ: BED.halfWidth,
  },
  tailLamp: { minX: -1.675, maxX: -1.665, minY: 0.76, maxY: 1.08, minZ: 0.79, maxZ: 0.9 },
  gateHandle: { minX: -1.676, maxX: -1.668, minY: 0.98, maxY: 1.02, minZ: -0.12, maxZ: 0.12 },
  plate: { minX: -1.677, maxX: -1.669, minY: 0.52, maxY: 0.63, minZ: -0.26, maxZ: 0.26 },
  rearBumper: { minX: -HALF, maxX: -1.58, minY: 0.36, maxY: 0.48, minZ: -0.88, maxZ: 0.88 },
  frontBumper: { minX: 1.6, maxX: HALF, minY: 0.34, maxY: 0.54, minZ: -0.9, maxZ: 0.9 },
  rearWindow: {
    minX: CAB_BACK - 0.006,
    maxX: CAB_BACK + 0.004,
    minY: 1.36,
    maxY: 1.78,
    minZ: -0.55,
    maxZ: 0.55,
  },
} as const;

const MIRROR = {
  housing: { minX: 0.82, maxX: 0.9, minY: 1.14, maxY: 1.36, minZ: 0.93, maxZ: 1.0 },
  glass: { minX: 0.814, maxX: 0.82, minY: 1.16, maxY: 1.34, minZ: 0.935, maxZ: 0.995 },
  arm: { minX: 0.84, maxX: 0.88, minY: 1.16, maxY: 1.2, minZ: 0.86, maxZ: 0.93 },
} as const;

const HANDLE = { xs: [-0.22], y: 1.0 } as const;

const INNER = BED.halfWidth - BED.wall;

const BED_RING: readonly SectionPoint[] = [
  [0, BED.floor],
  [INNER, BED.floor],
  [INNER, BED.rail],
  [BED.halfWidth - BED.railRadius, BED.rail],
  [BED.halfWidth, BED.rail - BED.railRadius],
  [BED.halfWidth, BED.waist],
  [BED.halfWidth, BED.bottom + BED.bottomRadius],
  [BED.halfWidth - BED.bottomRadius, BED.bottom],
  [0, BED.bottom],
];

function isLiftedBand(x: number, band: number): boolean {
  return [band, band + 1].every((index) => liftUnderArches(ARCHES, x, BED_RING[index]).lifted);
}

function bed(paint: BodyPaint, uv: SwatchUv): BufferGeometry {
  const stations = mergeStations(
    [...archStations(ARCHES[1]), ...spacedStations(BED.from, BED.to, BED.spacing)].filter(
      (x) => x > BED.from && x < BED.to,
    ),
    [BED.from, BED.to],
    MINIMUM_GAP,
  );
  return loft({
    stations,
    ring: (x) => BED_RING.map((point) => liftUnderArches(ARCHES, x, point).point),
    uvAt: (x, band) => {
      if (isLiftedBand(x, band)) return uv('under');
      const swatch = BED_SWATCHES[band];
      return uv(swatch === 'paint' ? paint : swatch);
    },
  });
}

function pieces(paint: BodyPaint, uv: SwatchUv): BufferGeometry[] {
  return [
    paintedBox(PIECES.bulkhead, paint, uv),
    paintedBox(PIECES.tailgate, paint, uv),
    ...mirroredBoxes(PIECES.tailLamp, 'lampRear', uv),
    paintedBox(PIECES.gateHandle, 'trim', uv),
    paintedBox(PIECES.plate, 'plate', uv),
    paintedBox(PIECES.rearBumper, 'steel', uv),
    paintedBox(PIECES.frontBumper, 'steel', uv),
    paintedBox(PIECES.rearWindow, 'glass', uv),
    ...mirroredBoxes(MIRROR.housing, 'trim', uv),
    ...mirroredBoxes(MIRROR.glass, 'glass', uv),
    ...mirroredBoxes(MIRROR.arm, 'trim', uv),
    ...doorHandles(FRONT, HANDLE.xs, HANDLE.y, uv),
  ];
}

function pickupGeometry(size: VehicleSize, paint: BodyPaint, uv: SwatchUv): BufferGeometry {
  const stretch = stretchOf(size, PICKUP_DESIGN);
  const body = stretched(
    [
      FRONT.geometry(paint, uv),
      FRONT.cabin(CABIN, paint, uv),
      bed(paint, uv),
      ...pieces(paint, uv),
    ],
    stretch,
  );
  return mergeParts([body, ...axleWheels(AXLES, stretch, uv)]);
}

export const PICKUP_MODEL: VehicleModel = {
  design: PICKUP_DESIGN,
  axles: AXLES,
  geometry: pickupGeometry,
};
