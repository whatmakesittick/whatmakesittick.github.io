import { CHAMBER_IDS } from '../ids';
import type { ChamberId, HeartSound, ValveId } from '../ids';
import type { Curve } from './curve';
import {
  BEAT_MS,
  END_DIASTOLIC_ML,
  heartSound,
  leftAtrialPressure,
  leftVentriclePressure,
  rightAtrialPressure,
  rightVentriclePressure,
  valveClosesAt,
  valveOpening,
  valveOpensAt,
} from './cycle';
import { VALVES } from './layout';

export interface WallRange {
  readonly from: number;
  readonly to: number;
}

export interface ChamberFacts {
  readonly wallMm: WallRange;
  readonly peakPressureMmHg: number;
  readonly fullestMl: number;
}

export interface ValveFacts {
  readonly leaflets: number;
  readonly opensAtMs: number;
  readonly closesAtMs: number;
  readonly sound: HeartSound;
}

export type ValveMotion = 'open' | 'shut' | 'opening' | 'closing';

export type ValveMoment = ValveMotion | HeartSound;

const ATRIUM_FULLEST_ML = 50;
const PRESSURE_SAMPLE_MS = 1;
const MOTION_STEP_MS = 1;

const WALL_MM: Readonly<Record<ChamberId, WallRange>> = {
  rightAtrium: { from: 2, to: 3 },
  rightVentricle: { from: 3, to: 5 },
  leftAtrium: { from: 2, to: 3 },
  leftVentricle: { from: 10, to: 12 },
};

const FULLEST_ML: Readonly<Record<ChamberId, number>> = {
  rightAtrium: ATRIUM_FULLEST_ML,
  rightVentricle: END_DIASTOLIC_ML,
  leftAtrium: ATRIUM_FULLEST_ML,
  leftVentricle: END_DIASTOLIC_ML,
};

const CHAMBER_PRESSURE: Readonly<Record<ChamberId, Curve>> = {
  rightAtrium: rightAtrialPressure,
  rightVentricle: rightVentriclePressure,
  leftAtrium: leftAtrialPressure,
  leftVentricle: leftVentriclePressure,
};

const CLOSING_SOUND: Readonly<Record<ValveId, HeartSound>> = {
  tricuspid: 's1',
  mitral: 's1',
  pulmonary: 's2',
  aortic: 's2',
};

export function peakOf(curve: Curve): number {
  let peak = Number.NEGATIVE_INFINITY;
  for (let time = 0; time < BEAT_MS; time += PRESSURE_SAMPLE_MS) peak = Math.max(peak, curve(time));
  return peak;
}

export const CHAMBER_FACTS: Readonly<Record<ChamberId, ChamberFacts>> = Object.fromEntries(
  CHAMBER_IDS.map((chamber) => [
    chamber,
    {
      wallMm: WALL_MM[chamber],
      peakPressureMmHg: peakOf(CHAMBER_PRESSURE[chamber]),
      fullestMl: FULLEST_ML[chamber],
    },
  ]),
) as Record<ChamberId, ChamberFacts>;

export function valveFacts(valve: ValveId): ValveFacts {
  return {
    leaflets: VALVES[valve].leaflets,
    opensAtMs: valveOpensAt(valve),
    closesAtMs: valveClosesAt(valve),
    sound: CLOSING_SOUND[valve],
  };
}

export function valveMotion(valve: ValveId, time: number): ValveMotion {
  const opening = valveOpening(valve, time);
  if (opening >= 1) return 'open';
  if (opening <= 0) return 'shut';
  return valveOpening(valve, time + MOTION_STEP_MS) > opening ? 'opening' : 'closing';
}

export function valveMoment(valve: ValveId, time: number): ValveMoment {
  const motion = valveMotion(valve, time);
  return motion === 'shut' && heartSound(time) === CLOSING_SOUND[valve]
    ? CLOSING_SOUND[valve]
    : motion;
}
