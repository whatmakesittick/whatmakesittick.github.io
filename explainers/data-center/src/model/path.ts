import { clamp, lerp } from '@core/math';
import type { CarrierId, CoolingId, PhaseId, Point } from '../ids';
import {
  AIR_CEILING_Y,
  AIR_HANDLERS,
  BUSBAR,
  BUSWAY,
  CDU,
  CHILLER,
  CHIP_ANCHOR,
  DRY_COOLERS,
  GRID_LINE,
  HOT_AISLE_Z,
  MANIFOLD,
  MV_ENTRY,
  PLUME_TOP,
  RACK_STACK,
  RISER,
  ROOF_HEADER_Z,
  ROOF_PIPE_Y,
  ROOF_Y,
  ROOM_TRAY_Y,
  ROW_PIPE,
  SUBJECT_CDU,
  SUBJECT_RACK,
  SUBJECT_TRAY_Y,
  SWITCHGEAR,
  TAP_BOX,
  TRANSFORMERS,
  UPS,
  WALL_PIPE_X,
  boxCentre,
  boxSpan,
  boxTop,
} from './layout';

export interface PathLeg {
  phase: PhaseId;
  carrier: CarrierId;
  points: readonly Point[];
}

export interface PathPose {
  position: Point;
  heading: number;
}

interface Segment {
  from: Point;
  to: Point;
  start: number;
  length: number;
  heading: number;
  leg: number;
}

interface Track {
  segments: readonly Segment[];
  length: number;
}

type RawSegment = Omit<Segment, 'start' | 'heading'> & { heading: number | null };

const FLAT_EPSILON = 1e-9;
const CABLE_Y = MV_ENTRY[1];
const CABLE_TURN_X = -58;
const ROOM_WEST_AISLE_X = -35;
const ROOM_EAST_AISLE_X = -25.5;
const ROOF_NORTH_RUN_Z = -11.5;
const ROOF_HEADER_X = 9.5;
const PATH_COOLER_INDEX = 2;
const PATH_AIR_HANDLER_INDEX = 3;

const FEED_TRANSFORMER = TRANSFORMERS[0];
const PATH_COOLER = DRY_COOLERS[PATH_COOLER_INDEX];
const PATH_AIR_HANDLER = AIR_HANDLERS[PATH_AIR_HANDLER_INDEX];
const [RACK_X, , RACK_Z] = SUBJECT_RACK;
const [TRANSFORMER_X, , TRANSFORMER_Z] = FEED_TRANSFORMER.base;
const [UPS_X, , UPS_Z] = UPS.base;
const [SWITCHGEAR_X, , SWITCHGEAR_Z] = SWITCHGEAR.base;
const [CHILLER_X, , CHILLER_Z] = CHILLER.base;
const [COOLER_X, , COOLER_Z] = PATH_COOLER.base;
const [HANDLER_X, HANDLER_CORE_Y, HANDLER_Z] = boxCentre(PATH_AIR_HANDLER);
const [, CHIP_Y, CHIP_Z] = CHIP_ANCHOR;
const SHELF_Y = (RACK_STACK.upperShelves[0] + RACK_STACK.upperShelves[1]) / 2;
const CDU_CORE_Y = CDU.height / 2;
const CDU_DROP_X = SUBJECT_CDU.base[0] - CDU.width / 4;

export const WAYPOINTS = {
  lineStart: [GRID_LINE.fromX, GRID_LINE.y, GRID_LINE.z],
  gantry: [GRID_LINE.toX, GRID_LINE.y, GRID_LINE.z],
  transformerTop: boxTop(FEED_TRANSFORMER),
  transformerCore: [TRANSFORMER_X, CABLE_Y, TRANSFORMER_Z],
  transformerOut: [boxSpan(FEED_TRANSFORMER).x[1], CABLE_Y, TRANSFORMER_Z],
  mvEntry: MV_ENTRY,
  switchgear: [SWITCHGEAR_X, CABLE_Y, SWITCHGEAR_Z],
  ups: [UPS_X, CABLE_Y, UPS_Z],
  buswayEnd: [BUSWAY.endX, BUSWAY.mainY, BUSWAY.mainZ],
  tapBox: TAP_BOX,
  shelf: [RACK_X, SHELF_Y, RACK_Z],
  busbarFoot: [RACK_X, SUBJECT_TRAY_Y, BUSBAR.z],
  chip: CHIP_ANCHOR,
  riserTop: [RISER.x, RISER.top, RISER.z],
  airHandler: [HANDLER_X, HANDLER_CORE_Y, HANDLER_Z],
  wallPipeTop: [WALL_PIPE_X, ROOF_Y, HANDLER_Z],
  chiller: [CHILLER_X, ROOF_PIPE_Y, CHILLER_Z],
  dryCooler: [COOLER_X, ROOF_PIPE_Y, COOLER_Z],
  plumeTop: PLUME_TOP,
} as const satisfies Record<string, Point>;

function leg(phase: PhaseId, carrier: CarrierId, points: readonly Point[]): PathLeg {
  return { phase, carrier, points };
}

const POWER_LEGS: readonly PathLeg[] = [
  leg('grid', 'line', [
    WAYPOINTS.lineStart,
    WAYPOINTS.gantry,
    WAYPOINTS.transformerTop,
    WAYPOINTS.transformerCore,
    WAYPOINTS.transformerOut,
  ]),
  leg('protect', 'cable', [
    WAYPOINTS.transformerOut,
    [CABLE_TURN_X, CABLE_Y, TRANSFORMER_Z],
    [CABLE_TURN_X, CABLE_Y, MV_ENTRY[2]],
    WAYPOINTS.mvEntry,
    [ROOM_WEST_AISLE_X, CABLE_Y, MV_ENTRY[2]],
    [ROOM_WEST_AISLE_X, CABLE_Y, SWITCHGEAR_Z],
    WAYPOINTS.switchgear,
  ]),
  leg('protect', 'ups', [
    WAYPOINTS.switchgear,
    [SWITCHGEAR_X, ROOM_TRAY_Y, SWITCHGEAR_Z],
    [UPS_X, ROOM_TRAY_Y, UPS_Z],
    WAYPOINTS.ups,
  ]),
  leg('distribute', 'busway', [
    WAYPOINTS.ups,
    [ROOM_EAST_AISLE_X, CABLE_Y, UPS_Z],
    [ROOM_EAST_AISLE_X, BUSWAY.mainY, UPS_Z],
    [ROOM_EAST_AISLE_X, BUSWAY.mainY, BUSWAY.mainZ],
    WAYPOINTS.buswayEnd,
    [BUSWAY.endX, BUSWAY.mainY, RACK_Z],
    [BUSWAY.endX, BUSWAY.rowY, RACK_Z],
    WAYPOINTS.tapBox,
    WAYPOINTS.shelf,
  ]),
  leg('compute', 'busbar', [WAYPOINTS.shelf, [RACK_X, SHELF_Y, BUSBAR.z], WAYPOINTS.busbarFoot]),
  leg('compute', 'chip', [WAYPOINTS.busbarFoot, [RACK_X, SUBJECT_TRAY_Y, CHIP_Z], WAYPOINTS.chip]),
];

const PLUME_LEG = leg('release', 'air', [
  WAYPOINTS.dryCooler,
  [COOLER_X, boxTop(PATH_COOLER)[1], COOLER_Z],
  WAYPOINTS.plumeTop,
]);

const ROOF_TAIL: readonly Point[] = [
  WAYPOINTS.chiller,
  [ROOF_HEADER_X, ROOF_PIPE_Y, CHILLER_Z],
  [ROOF_HEADER_X, ROOF_PIPE_Y, ROOF_HEADER_Z],
  [COOLER_X, ROOF_PIPE_Y, ROOF_HEADER_Z],
  WAYPOINTS.dryCooler,
];

const LIQUID_HEAT_LEGS: readonly PathLeg[] = [
  leg('cool', 'water', [
    WAYPOINTS.chip,
    [MANIFOLD.returnX, CHIP_Y, CHIP_Z],
    [MANIFOLD.returnX, CHIP_Y, MANIFOLD.z],
    [MANIFOLD.returnX, ROW_PIPE.y, ROW_PIPE.z],
    [CDU_DROP_X, ROW_PIPE.y, ROW_PIPE.z],
    [CDU_DROP_X, CDU_CORE_Y, ROW_PIPE.z],
    [RISER.x, CDU_CORE_Y, RISER.z],
    WAYPOINTS.riserTop,
  ]),
  leg('release', 'water', [
    WAYPOINTS.riserTop,
    [RISER.x, ROOF_PIPE_Y, RISER.z],
    [RISER.x, ROOF_PIPE_Y, CHILLER_Z],
    ...ROOF_TAIL,
  ]),
  PLUME_LEG,
];

const AIR_HEAT_LEGS: readonly PathLeg[] = [
  leg('cool', 'air', [
    WAYPOINTS.chip,
    [RACK_X, CHIP_Y, HOT_AISLE_Z],
    [RACK_X, AIR_CEILING_Y, HOT_AISLE_Z],
    [HANDLER_X, AIR_CEILING_Y, HANDLER_Z],
    [HANDLER_X, boxTop(PATH_AIR_HANDLER)[1], HANDLER_Z],
    WAYPOINTS.airHandler,
  ]),
  leg('cool', 'water', [
    WAYPOINTS.airHandler,
    [WALL_PIPE_X, HANDLER_CORE_Y, HANDLER_Z],
    WAYPOINTS.wallPipeTop,
  ]),
  leg('release', 'water', [
    WAYPOINTS.wallPipeTop,
    [WALL_PIPE_X, ROOF_PIPE_Y, HANDLER_Z],
    [WALL_PIPE_X, ROOF_PIPE_Y, ROOF_NORTH_RUN_Z],
    [CHILLER_X, ROOF_PIPE_Y, ROOF_NORTH_RUN_Z],
    ...ROOF_TAIL,
  ]),
  PLUME_LEG,
];

export const ENERGY_PATH: Readonly<Record<CoolingId, readonly PathLeg[]>> = {
  liquid: [...POWER_LEGS, ...LIQUID_HEAT_LEGS],
  air: [...POWER_LEGS, ...AIR_HEAT_LEGS],
};

function byPhase<T>(read: (phase: PhaseId) => T): Readonly<Record<PhaseId, T>> {
  return {
    grid: read('grid'),
    protect: read('protect'),
    distribute: read('distribute'),
    compute: read('compute'),
    cool: read('cool'),
    release: read('release'),
  };
}

function byCooling<T>(read: (cooling: CoolingId) => T): Readonly<Record<CoolingId, T>> {
  return { liquid: read('liquid'), air: read('air') };
}

const PHASE_LEGS = byCooling((cooling) =>
  byPhase((phase) => ENERGY_PATH[cooling].filter((entry) => entry.phase === phase)),
);

export function legsFor(cooling: CoolingId, phase: PhaseId): readonly PathLeg[] {
  return PHASE_LEGS[cooling][phase];
}

function distance(from: Point, to: Point): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

function flatHeading(from: Point, to: Point): number | null {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  return Math.hypot(dx, dz) > FLAT_EPSILON ? Math.atan2(-dz, dx) : null;
}

export function legLength({ points }: PathLeg): number {
  return points.slice(1).reduce((sum, to, index) => sum + distance(points[index], to), 0);
}

export function pathLength(legs: readonly PathLeg[]): number {
  return legs.reduce((sum, entry) => sum + legLength(entry), 0);
}

function rawSegments(legs: readonly PathLeg[]): RawSegment[] {
  return legs.flatMap(({ points }, legIndex) =>
    points.slice(1).map((to, index) => ({
      from: points[index],
      to,
      length: distance(points[index], to),
      heading: flatHeading(points[index], to),
      leg: legIndex,
    })),
  );
}

function filledHeadings(raw: readonly RawSegment[]): number[] {
  const first = raw.find(({ heading }) => heading !== null)?.heading ?? 0;
  return raw.reduce<number[]>((headings, { heading }) => {
    const previous = headings.length > 0 ? headings[headings.length - 1] : first;
    return [...headings, heading ?? previous];
  }, []);
}

function buildTrack(legs: readonly PathLeg[]): Track {
  const raw = rawSegments(legs);
  const headings = filledHeadings(raw);
  let start = 0;
  const segments = raw.map((segment, index) => {
    const placed = { ...segment, start, heading: headings[index] };
    start += segment.length;
    return placed;
  });
  return { segments, length: start };
}

const TRACKS = new WeakMap<readonly PathLeg[], Track>();

function trackOf(legs: readonly PathLeg[]): Track {
  const cached = TRACKS.get(legs);
  if (cached) return cached;
  const track = buildTrack(legs);
  TRACKS.set(legs, track);
  return track;
}

function segmentAt(legs: readonly PathLeg[], share: number): [Segment, number] {
  const { segments, length } = trackOf(legs);
  if (segments.length === 0) throw new Error('A path needs at least one leg with two points');
  const last = segments[segments.length - 1];
  if (share >= 1) return [last, 1];
  const reach = Math.max(0, share) * length;
  const segment = segments.find(({ start, length: span }) => start + span >= reach) ?? last;
  const along = segment.length > 0 ? clamp((reach - segment.start) / segment.length, 0, 1) : 0;
  return [segment, along];
}

export function pointOnLegs(legs: readonly PathLeg[], share: number): PathPose {
  const [{ from, to, heading }, along] = segmentAt(legs, share);
  return {
    position: [
      lerp(from[0], to[0], along),
      lerp(from[1], to[1], along),
      lerp(from[2], to[2], along),
    ],
    heading,
  };
}

export function legAt(legs: readonly PathLeg[], share: number): PathLeg {
  const [segment] = segmentAt(legs, share);
  return legs[segment.leg];
}
