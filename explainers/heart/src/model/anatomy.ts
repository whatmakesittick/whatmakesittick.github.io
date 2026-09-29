import type { ChamberId, HeartSound, ValveId, ValveState } from '../ids';
import { heartSound, valveClosesAt, valveOpening, valveOpensAt, valveState } from './cycle';
import { VALVES } from './layout';

export interface ValveFacts {
  readonly leaflets: number;
  readonly opensAtMs: number;
  readonly closesAtMs: number;
  readonly sound: HeartSound;
}

export type ValveMotion = 'open' | 'shut' | 'opening' | 'closing';

export type ValveMoment = ValveMotion | HeartSound;

const MOTION_STEP_MS = 1;

export const PEAK_PRESSURE_MMHG: Readonly<Record<ChamberId, number>> = {
  rightAtrium: 5,
  rightVentricle: 25,
  leftAtrium: 10,
  leftVentricle: 120,
};

const OPEN_IN_STATE: Readonly<Record<ValveState, readonly ValveId[]>> = {
  avOpen: ['tricuspid', 'mitral'],
  allClosed: [],
  semilunarOpen: ['pulmonary', 'aortic'],
};

const CLOSING_SOUND: Readonly<Record<ValveId, HeartSound>> = {
  tricuspid: 's1',
  mitral: 's1',
  pulmonary: 's2',
  aortic: 's2',
};

export function valveFacts(valve: ValveId): ValveFacts {
  return {
    leaflets: VALVES[valve].leaflets,
    opensAtMs: valveOpensAt(valve),
    closesAtMs: valveClosesAt(valve),
    sound: CLOSING_SOUND[valve],
  };
}

function isOpenInPhase(valve: ValveId, time: number): boolean {
  return OPEN_IN_STATE[valveState(time)].includes(valve);
}

export function valveMotion(valve: ValveId, time: number): ValveMotion {
  const opening = valveOpening(valve, time);
  const openInPhase = isOpenInPhase(valve, time);
  if (opening >= 1) return openInPhase ? 'open' : 'closing';
  if (opening <= 0) return openInPhase ? 'opening' : 'shut';
  return valveOpening(valve, time + MOTION_STEP_MS) > opening ? 'opening' : 'closing';
}

export function valveMoment(valve: ValveId, time: number): ValveMoment {
  const motion = valveMotion(valve, time);
  const sound = CLOSING_SOUND[valve];
  return motion === 'shut' && heartSound(time) === sound ? sound : motion;
}
