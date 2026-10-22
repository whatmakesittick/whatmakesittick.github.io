import { DoubleSide } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { STATIONS, TRAIN } from '../../../../model';
import type { StationId } from '../../../../model';

export const FLOOR = STATIONS.platformFloor;
export const HALF_LENGTH = STATIONS.platformLength / 2;

const LEFT_PLATFORM_END = 20;

export function platformRun(side: number): [number, number] {
  return side < 0 ? [-HALF_LENGTH, LEFT_PLATFORM_END] : [-HALF_LENGTH, HALF_LENGTH];
}

export function onPlatform(x: number, side: number): boolean {
  const [from, to] = platformRun(side);
  return x >= from && x <= to;
}

const EDGE_CLEARANCE = 0.12;
const PLATFORM_WIDTH = 8.5;

export const PLATFORM = {
  edge: TRAIN.width / 2 + EDGE_CLEARANCE,
  outer: TRAIN.width / 2 + EDGE_CLEARANCE + PLATFORM_WIDTH,
  slab: 0.55,
  finish: 0.04,
  edgeChamfer: 0.18,
  nosing: 0.12,
  tactileOffset: 0.5,
  tactileWidth: 0.3,
  stripProud: 0.004,
  kerbWidth: 0.16,
  kerbHeight: 0.18,
} as const;

export const SUPPORT = {
  beamZ: 6.2,
  beamWidth: 1.2,
  beamDepth: 0.85,
  columnRadius: 0.5,
  columnSpacing: 15,
  footing: 1.6,
  footingHeight: 0.3,
  segments: 16,
} as const;

export const CANOPY = {
  halfSpan: 12.2,
  eave: 16.8,
  crown: 19.4,
  thickness: 0.32,
  length: 196,
  edgeBand: 1.8,
  glazing: 0.05,
  purlins: [0, 3, 6, 8.4],
  purlinWidth: 0.12,
  purlinDepth: 0.16,
  steps: 14,
  ribSpacing: 12,
  ribDepth: 0.42,
  ribWidth: 0.24,
  ribInset: 0.3,
  gutterWidth: 0.32,
  gutterDepth: 0.42,
  endChamfer: 0.08,
} as const;

export const CANOPY_COLUMN = {
  z: 9.7,
  baseRadius: 0.2,
  topRadius: 0.13,
  forkHeight: 15.4,
  forkSpread: 1.5,
  strutRadius: 0.09,
  segments: 10,
} as const;

export const SCREEN = {
  z: PLATFORM.outer - 0.12,
  thickness: 0.024,
  height: 2.4,
  mullionSpacing: 3,
  mullionWidth: 0.06,
  mullionDepth: 0.1,
  railHeight: 0.08,
  endGap: 0.6,
} as const;

export const LIGHT_STRIP = {
  z: 5.6,
  width: 0.28,
  height: 0.06,
  drop: 0.14,
} as const;

export const ESCALATOR = {
  run: 20,
  landing: 2.2,
  deck: 0.9,
  enclosure: 2.6,
  roof: 0.16,
  inner: PLATFORM.outer + 0.08,
  width: 1.6,
} as const;

export interface BuildingSpec {
  readonly x: readonly [number, number];
  readonly z: readonly [number, number];
  readonly height: number;
  readonly finSpacing: number;
  readonly bands: number;
  readonly roofRise: number;
}

export interface StationStyle {
  readonly escalatorX: number;
  readonly hall: BuildingSpec;
  readonly link: boolean;
}

export const STATION_STYLES: Readonly<Record<StationId, StationStyle>> = {
  longyangRoad: {
    escalatorX: -58,
    hall: { x: [-62, 28], z: [13, 30], height: 8, finSpacing: 3, bands: 1, roofRise: 1.2 },
    link: false,
  },
  airport: {
    escalatorX: -30,
    hall: { x: [-36, 96], z: [22, 58], height: 15, finSpacing: 3.6, bands: 3, roofRise: 3.2 },
    link: true,
  },
};

export const HALL = {
  roofOverhang: 1.6,
  roofThickness: 0.7,
  plinth: 0.4,
  glassInset: 0.6,
  finWidth: 0.12,
  finDepth: 0.35,
  bandHeight: 0.6,
  roofSteps: 16,
  roofChamfer: 0.12,
} as const;

export const LINK = {
  x: [-9, 9] as const,
  height: 3.2,
  floorThickness: 0.35,
} as const;

export const STATION_FINISHES = {
  tactile: { color: '#d9b43a', roughness: 0.7, metalness: 0 },
  nosing: { color: '#3d4045', roughness: 0.8, metalness: 0 },
  paint: { color: '#dfe2e4', roughness: 0.45, metalness: 0.25 },
  trim: { color: '#9aa2a9', roughness: 0.4, metalness: 0.55 },
  facade: { color: '#6d8b9c', roughness: 0.1, metalness: 0.55 },
  glazing: {
    color: '#e4edf1',
    roughness: 0.18,
    metalness: 0.1,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: DoubleSide,
  },
  lamp: { color: '#fffaf0', emissive: '#fff4dc', emissiveIntensity: 0.85, roughness: 0.6 },
} as const satisfies Record<string, MaterialFinish>;

export const LABEL_POINT = [0, FLOOR + 2, -PLATFORM.edge - 2] as const;

export const FURNITURE = {
  benchZ: 7.6,
  benchLength: 2.4,
  benchDepth: 0.5,
  benchSeat: 0.45,
  benchThickness: 0.06,
  benchBack: 0.45,
  benchEvery: 2,
  signZ: PLATFORM.edge + 3.4,
  signLength: 3.2,
  signHeight: 0.55,
  signThickness: 0.1,
  signBottom: 3.3,
  signBand: 0.08,
  signEvery: 4,
  bandProud: 0.006,
  rodRadius: 0.02,
  rodSegments: 6,
} as const;
