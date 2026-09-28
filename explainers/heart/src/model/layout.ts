import type { ChamberId, ValveId } from '../ids';
import type { Box, Point } from './scale';

export interface ChamberLayout {
  centre: Point;
  radii: Point;
  wall: number;
}

export interface ValveLayout {
  centre: Point;
  radius: number;
  normal: Point;
  leaflets: number;
}

export interface VesselMouth {
  point: Point;
  direction: Point;
}

export const CHAMBERS: Readonly<Record<ChamberId, ChamberLayout>> = {
  rightAtrium: { centre: [-27, 27, 0], radii: [19, 19, 17], wall: 2 },
  rightVentricle: { centre: [-22, -26, 4], radii: [19, 34, 17], wall: 3 },
  leftAtrium: { centre: [24, 29, -4], radii: [20, 18, 17], wall: 2 },
  leftVentricle: { centre: [20, -32, 0], radii: [21, 40, 21], wall: 9 },
};

export const APEX: Point = [30, -84, 6];

export const VALVES: Readonly<Record<ValveId, ValveLayout>> = {
  tricuspid: { centre: [-22, 2, 2], radius: 15, normal: [0, -1, 0], leaflets: 3 },
  mitral: { centre: [21, 2, -1], radius: 14, normal: [0, -1, 0], leaflets: 2 },
  pulmonary: { centre: [-5, 27, 7], radius: 11, normal: [0.1, 1, -0.1], leaflets: 3 },
  aortic: { centre: [3, 21, -4], radius: 11, normal: [-0.1, 1, 0], leaflets: 3 },
};

export const SEPTUM = { x: 0, top: 8, bottom: -70, thickness: 10 } as const;

export const SINUS_NODE = { centre: [-30, 44, 2] as Point, length: 8, width: 3 } as const;

export const AV_NODE: Point = [-6, 8, -2];

export const BUNDLE_PATH: readonly Point[] = [
  [-4, 6, -2],
  [-2, -2, -2],
];

export const RIGHT_BRANCH_PATH: readonly Point[] = [
  [-2, -2, -2],
  [-5, -40, 1],
  [-14, -60, 4],
];

export const LEFT_BRANCH_PATH: readonly Point[] = [
  [-2, -2, -2],
  [5, -40, -2],
  [16, -62, 2],
];

export const VESSEL_MOUTHS = {
  aorta: { point: [3, 21, -4], direction: [-0.1, 1, 0] },
  pulmonaryTrunk: { point: [-5, 27, 7], direction: [0.1, 1, -0.1] },
  superiorVenaCava: { point: [-28, 46, 0], direction: [0, 1, 0] },
  inferiorVenaCava: { point: [-30, 10, -6], direction: [-0.1, -1, -0.25] },
} as const satisfies Record<string, VesselMouth>;

export const PULMONARY_VEIN_MOUTHS: readonly VesselMouth[] = [
  { point: [44, 32, -8], direction: [1, 0.1, -0.2] },
  { point: [44, 22, -10], direction: [1, -0.1, -0.2] },
  { point: [12, 40, -18], direction: [-0.6, 0.2, -1] },
  { point: [20, 30, -20], direction: [-0.6, 0, -1] },
];

const UPSTREAM: Readonly<Record<ValveId, ChamberId>> = {
  tricuspid: 'rightAtrium',
  pulmonary: 'rightVentricle',
  mitral: 'leftAtrium',
  aortic: 'leftVentricle',
};

const DOWNSTREAM: Readonly<Record<ValveId, ChamberId | null>> = {
  tricuspid: 'rightVentricle',
  pulmonary: null,
  mitral: 'leftVentricle',
  aortic: null,
};

export function upstreamChamber(valve: ValveId): ChamberId {
  return UPSTREAM[valve];
}

export function downstreamChamber(valve: ValveId): ChamberId | null {
  return DOWNSTREAM[valve];
}

export function isLeftHeart(chamber: ChamberId): boolean {
  return chamber.startsWith('left');
}

export function isAtrium(chamber: ChamberId): boolean {
  return chamber.endsWith('Atrium');
}

export function chamberBox(chamber: ChamberId): Box {
  const { centre, radii } = CHAMBERS[chamber];
  return {
    x: [centre[0] - radii[0], centre[0] + radii[0]],
    y: [centre[1] - radii[1], centre[1] + radii[1]],
    z: [centre[2] - radii[2], centre[2] + radii[2]],
  };
}

export function chamberOuterBox(chamber: ChamberId): Box {
  const inner = chamberBox(chamber);
  const { wall } = CHAMBERS[chamber];
  return {
    x: [inner.x[0] - wall, inner.x[1] + wall],
    y: [inner.y[0] - wall, inner.y[1] + wall],
    z: [inner.z[0] - wall, inner.z[1] + wall],
  };
}

export function valveRing(valve: ValveId): { centre: Point; radius: number } {
  const { centre, radius } = VALVES[valve];
  return { centre, radius };
}
