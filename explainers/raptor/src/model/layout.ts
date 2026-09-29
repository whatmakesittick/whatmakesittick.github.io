import { toRadians } from '@core/math';
import type { StreamId } from '../ids';
import type { Point } from './scale';

export interface Disc {
  y: number;
  radius: number;
}

export interface Cylinder {
  top: number;
  bottom: number;
  radius: number;
}

export interface Canister extends Cylinder {
  centre: Point;
}

export interface Ring extends Disc {
  tube: number;
}

export interface Strut {
  top: Point;
  bottom: Point;
}

export type PumpSide = 'oxygen' | 'methane';

export const THRUST_MOUNT: Cylinder = { top: 16, bottom: 0, radius: 34 };

export const GIMBAL = { centre: [0, 0, 0] as Point, radius: 18 };

export const POWERHEAD = { top: -8, bottom: -95 };

export const INJECTOR: Disc = { y: -95, radius: 19 };

export const CHAMBER: Cylinder = { top: -95, bottom: -128, radius: 19 };

export const THROAT: Disc = { y: -152, radius: 11 };

export const NOZZLE_EXIT: Disc = { y: -310, radius: 64 };

export const EXPANSION_RATIO = (NOZZLE_EXIT.radius / THROAT.radius) ** 2;

export const WALL_THICKNESS = { chamber: 2.5, nozzle: 1.5 };

export const COOLING_CHANNELS = { count: 96, depth: 1 };

export const BELL_ANGLES = { throat: toRadians(32), exit: toRadians(8) };

export const TURBOPUMPS: Readonly<Record<PumpSide, Canister>> = {
  oxygen: { centre: [-33, -57, 0], radius: 13, top: -28, bottom: -86 },
  methane: { centre: [33, -57, 0], radius: 11, top: -30, bottom: -84 },
};

export const PREBURNERS: Readonly<Record<PumpSide, Canister>> = {
  oxygen: { centre: [-50, -62, 0], radius: 6.5, top: -44, bottom: -80 },
  methane: { centre: [48, -62, 0], radius: 6, top: -44, bottom: -80 },
};

export const HOT_GAS_MANIFOLD: Ring = { y: -91, radius: 26, tube: 6 };

export const INLETS: Readonly<Record<PumpSide, { centre: Point; radius: number }>> = {
  oxygen: { centre: [-33, -10, 0], radius: 10 },
  methane: { centre: [33, -10, 0], radius: 8.5 },
};

export const ACTUATORS: readonly Strut[] = [
  { top: [24, 10, 24], bottom: [24, -46, 26] },
  { top: [-24, 10, 24], bottom: [-24, -46, 26] },
];

export const COOLANT_MANIFOLD: Ring = { y: -300, radius: 67, tube: 4 };

const COOLANT_LINE_Z = -6;
const CHANNEL_OFFSET = 1.5;
const COOLANT_LINE_OFFSET = 5;
const WALL_SAMPLES = 12;

function convergeRadius(y: number): number {
  const share = (CHAMBER.bottom - y) / (CHAMBER.bottom - THROAT.y);
  return THROAT.radius + ((CHAMBER.radius - THROAT.radius) * (1 + Math.cos(Math.PI * share))) / 2;
}

function bellControl(): readonly [y: number, radius: number] {
  const length = THROAT.y - NOZZLE_EXIT.y;
  const throatSlope = Math.tan(BELL_ANGLES.throat);
  const exitSlope = Math.tan(BELL_ANGLES.exit);
  const depth =
    (NOZZLE_EXIT.radius - exitSlope * length - THROAT.radius) / (throatSlope - exitSlope);
  return [THROAT.y - depth, THROAT.radius + throatSlope * depth];
}

const BELL_CONTROL = bellControl();

function bellParameter(y: number): number {
  const a = THROAT.y - 2 * BELL_CONTROL[0] + NOZZLE_EXIT.y;
  const b = 2 * (BELL_CONTROL[0] - THROAT.y);
  const c = THROAT.y - y;
  if (Math.abs(a) < 1e-9) return -c / b;
  const root = Math.sqrt(b * b - 4 * a * c);
  const first = (-b + root) / (2 * a);
  return first >= 0 && first <= 1 ? first : (-b - root) / (2 * a);
}

function bellRadius(y: number): number {
  const t = bellParameter(y);
  const u = 1 - t;
  return u * u * THROAT.radius + 2 * u * t * BELL_CONTROL[1] + t * t * NOZZLE_EXIT.radius;
}

export function wallRadius(y: number): number {
  const height = Math.min(INJECTOR.y, Math.max(NOZZLE_EXIT.y, y));
  if (height >= CHAMBER.bottom) return CHAMBER.radius;
  if (height >= THROAT.y) return convergeRadius(height);
  return bellRadius(height);
}

function wallPath(x: (y: number) => number, z: number, from: number, to: number): Point[] {
  return Array.from({ length: WALL_SAMPLES + 1 }, (_, index) => {
    const y = from + ((to - from) * index) / WALL_SAMPLES;
    return [x(y), y, z] as Point;
  });
}

const CHAMBER_CENTRE: Point = [0, -112, 0];

export const STREAM_PATHS: Readonly<Record<StreamId, readonly (readonly Point[])[]>> = {
  liquidOxygen: [
    [
      [-33, 14, 0],
      [-33, -10, 0],
      [-33, -34, 0],
      [-44, -39, 0],
      [-50, -44, 0],
    ],
    [
      [-44, -39, 0],
      [-28, -16, -10],
      [26, -16, -10],
      [48, -44, 0],
    ],
  ],
  liquidMethane: [
    [
      [33, 14, 0],
      [33, -10, 0],
      [33, -34, 0],
      [44, -39, 0],
      [50, -58, COOLANT_LINE_Z],
      ...wallPath(
        (y) => wallRadius(y) + COOLANT_LINE_OFFSET,
        COOLANT_LINE_Z,
        -140,
        COOLANT_MANIFOLD.y,
      ),
      ...wallPath((y) => wallRadius(y) + CHANNEL_OFFSET, 0, COOLANT_MANIFOLD.y, INJECTOR.y - 3),
      [40, -100, 0],
      [57, -90, 0],
      [57, -50, 0],
      [48, -44, 0],
    ],
    [
      [44, -39, 0],
      [26, -22, -6],
      [-28, -22, -6],
      [-50, -44, 0],
    ],
  ],
  oxygenRichGas: [
    [
      [-50, -44, 0],
      [-50, -78, 0],
      [-41, -85, 0],
      [-33, -80, 0],
      [-27, -90, 0],
      [-17, -93, 0],
      [-8, -97, 0],
      CHAMBER_CENTRE,
    ],
  ],
  methaneRichGas: [
    [
      [48, -44, 0],
      [48, -78, 0],
      [40, -84, 0],
      [33, -79, 0],
      [27, -90, 0],
      [17, -93, 0],
      [8, -97, 0],
      CHAMBER_CENTRE,
    ],
  ],
};

export type RingId = 'centre' | 'middle' | 'outer';

export interface ClusterRing {
  id: RingId;
  radius: number;
  count: number;
  startDeg: number;
  gimbals: boolean;
}

export interface ClusterEngine {
  position: Point;
  ring: RingId;
  gimbals: boolean;
  isModelEngine: boolean;
}

export const BOOSTER_AXIS = { x: 0, z: -80 };

export const BOOSTER = { radius: 450, skirtTop: 600, baseY: 16 };

export const CLUSTER: readonly ClusterRing[] = [
  { id: 'centre', radius: 80, count: 3, startDeg: 90, gimbals: true },
  { id: 'middle', radius: 250, count: 10, startDeg: 18, gimbals: true },
  { id: 'outer', radius: 415, count: 20, startDeg: 9, gimbals: false },
];

const POSITION_TOLERANCE = 1e-6;

function ringEngines(ring: ClusterRing): ClusterEngine[] {
  return Array.from({ length: ring.count }, (_, index) => {
    const angle = toRadians(ring.startDeg + (360 * index) / ring.count);
    const x = BOOSTER_AXIS.x + ring.radius * Math.cos(angle);
    const z = BOOSTER_AXIS.z + ring.radius * Math.sin(angle);
    const isModelEngine = Math.hypot(x, z) < POSITION_TOLERANCE;
    return { position: [x, 0, z], ring: ring.id, gimbals: ring.gimbals, isModelEngine };
  });
}

export function clusterEngines(): ClusterEngine[] {
  return CLUSTER.flatMap(ringEngines);
}
