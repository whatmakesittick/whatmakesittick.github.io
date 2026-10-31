import type { Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { CHILLER, ROOF_PIPE_Y, ROOF_Y } from '../../../model';
import type { PartContext } from '../context';
import { DECK_M, SHROUD_M, buildCoilUnits } from './dryCoolers';
import type { CoilUnit, FanSet } from './dryCoolers';
import { DUNNAGE_TOP_Y, SIDES, drawer, dunnage, mirror, rod } from './pipeKit';
import type { Span, Tagged } from './pipeKit';

const [LENGTH, HEIGHT, DEPTH] = CHILLER.size;
const [CENTRE_X, BASE_Y, CENTRE_Z] = CHILLER.base;
const [HALF, EDGE] = [LENGTH / 2, DEPTH / 2];
const CABINET_M = 2;
const CABINET_END = CABINET_M - HALF;
const FAN_SCALE = 1.2;
const DECK_Y = HEIGHT - SHROUD_M * FAN_SCALE - DECK_M;
const TOP = DECK_Y + DECK_M;
const BAY = { rail: 0.2, top: 0.96, plate: 0.04 } as const;
const RAIL_Z = EDGE - 0.08;
const PANEL_M = 0.98;
const BARREL = { inset: 0.4, radius: 0.32 } as const;
const COMPRESSOR = { radius: 0.22, height: 0.52, offset: 0.78 } as const;
const COMPRESSOR_FINISH: MaterialFinish = { color: '#4b5957', roughness: 0.45, metalness: 0.35 };
const COMPRESSORS: readonly (readonly [number, number])[] = [
  ...[-1.9, -0.7, 0.5, 1.7, 2.9].map((x) => [x, COMPRESSOR.offset] as const),
  ...[-1.9, 1.7, 2.9].map((x) => [x, -COMPRESSOR.offset] as const),
];
const UNIT: CoilUnit = {
  length: LENGTH - CABINET_M,
  edge: EDGE,
  coilFrom: BAY.top + BAY.plate + 0.08,
  apexHalf: 0.45,
  deckY: DECK_Y,
  fans: [6, 2, FAN_SCALE],
  ends: [1],
};
const PANELS: readonly Span[] = [0.24, 1.28].flatMap((from) => [
  ...mirror([0.03 - HALF, 0.98 - HALF, from, from + PANEL_M, EDGE, EDGE + 0.02], [1], SIDES),
  ...mirror([1.02 - HALF, CABINET_END - 0.03, from, from + PANEL_M, EDGE, EDGE + 0.02], [1], SIDES),
  ...mirror([-HALF - 0.02, -HALF, from, from + PANEL_M, 0.02, EDGE - 0.03], [1], SIDES),
]);
const DARK: readonly Span[] = [
  ...mirror([-HALF, HALF, DUNNAGE_TOP_Y - ROOF_Y, BAY.rail, EDGE, EDGE - 0.16], [1], SIDES),
  ...[-4.92, -3, -0.5, 2, 4.92].map((x): Span => [
    x - 0.07,
    x + 0.07,
    0.06,
    BAY.rail,
    0.16 - EDGE,
    EDGE - 0.16,
  ]),
  ...[-2.95, -1.1, 1.1, 3.05, 4.95].flatMap((x) =>
    mirror([x - 0.05, x + 0.05, BAY.rail, BAY.top, RAIL_Z - 0.05, RAIL_Z + 0.05], [1], SIDES),
  ),
  [-HALF, CABINET_END, BAY.rail, TOP, -EDGE, EDGE],
  [-3.88, -3.83, 1.2, 1.5, EDGE + 0.24, EDGE + 0.27],
];
const BOXES: readonly Tagged[] = [
  ...DARK.map((span): Tagged => ['steelDark', span]),
  ...PANELS.map((span): Tagged => ['steelLight', span]),
  ['steelLight', [CABINET_END, HALF, BAY.top, BAY.top + BAY.plate, -EDGE, EDGE]],
  ['steelLight', [-HALF - 0.03, CABINET_END + 0.03, TOP, TOP + 0.06, -EDGE - 0.03, EDGE + 0.03]],
  ['cabinet', [-4.75, -3.75, 0.95, 1.95, EDGE + 0.02, EDGE + 0.24]],
  ['fan', [-4.55, -4.2, 1.55, 1.78, EDGE + 0.24, EDGE + 0.255]],
  ['statusLight', [-4.05, -3.98, 1.68, 1.75, EDGE + 0.24, EDGE + 0.255]],
];

export const CHILLER_BARREL = {
  east: CENTRE_X + HALF - BARREL.inset,
  north: CENTRE_Z - BARREL.radius,
} as const;

export function buildChiller(context: PartContext, group: Object3D): FanSet {
  const draw = drawer(context, 'chiller', group);
  const beams = SIDES.map((side) =>
    dunnage(CENTRE_X - HALF, CENTRE_X + HALF, CENTRE_Z + side * RAIL_Z),
  );
  const fans = buildCoilUnits(draw, UNIT, [[CENTRE_X + CABINET_M / 2, BASE_Y, CENTRE_Z]]);
  draw.boxes('steel', beams);
  draw.table([CHILLER.base], BOXES);
  const [foot, top] = [BASE_Y + BAY.rail, BASE_Y + BAY.rail + COMPRESSOR.height];
  const compressors = COMPRESSORS.map(([x, z]) =>
    rod([CENTRE_X + x, foot, CENTRE_Z + z], [CENTRE_X + x, top, CENTRE_Z + z], COMPRESSOR.radius),
  );
  draw.rods(COMPRESSOR_FINISH, compressors);
  const barrelFrom = CENTRE_X - HALF + BARREL.inset;
  const barrel = rod(
    [barrelFrom, ROOF_PIPE_Y, CENTRE_Z],
    [CHILLER_BARREL.east, ROOF_PIPE_Y, CENTRE_Z],
    BARREL.radius,
  );
  draw.rods('cable', [barrel]);
  return fans;
}
