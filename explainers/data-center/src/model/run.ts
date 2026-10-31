import { clamp, lerp } from '@core/math';
import { PHASE_IDS } from '../ids';
import type { CoolingId, JouleReading, MomentId, PhaseId } from '../ids';
import { legAt, legsFor, pointOnLegs } from './path';

export interface PhaseRange {
  start: number;
  end: number;
}

export const RUN_UNITS = 1000;
export const BASE_RUN_SECONDS = 240;
export const DEFAULT_SPEED = 4;
export const SLOW_SPEED = 2;
export const SPEED_RANGE = { min: 1, max: 16, step: 1, default: DEFAULT_SPEED } as const;

export const PHASE_RANGES: Readonly<Record<PhaseId, PhaseRange>> = {
  grid: { start: 0, end: 150 },
  protect: { start: 150, end: 300 },
  distribute: { start: 300, end: 450 },
  compute: { start: 450, end: 600 },
  cool: { start: 600, end: 850 },
  release: { start: 850, end: RUN_UNITS },
};

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  atRack: PHASE_RANGES.compute.start,
  becomesHeat: 520,
  inCoolant: PHASE_RANGES.cool.start,
  onRoof: PHASE_RANGES.release.start,
};

export const CLOCK_KNOTS = [0, 3e-7, 5e-7, 7e-7, 0.01, 40, 60] as const;

export const CHASE_SPAN: Readonly<Record<PhaseId, number>> = {
  grid: 30,
  protect: 12,
  distribute: 6,
  compute: 2.5,
  cool: 8,
  release: 30,
};

const GEOMETRIC_PHASES: ReadonlySet<PhaseId> = new Set(['compute']);
const LAST_PHASE = PHASE_IDS[PHASE_IDS.length - 1];
const LAST_KNOT = CLOCK_KNOTS[CLOCK_KNOTS.length - 1];

export function rate(speed: number): number {
  return (RUN_UNITS * speed) / BASE_RUN_SECONDS;
}

export function phaseAt(units: number): PhaseId {
  const clamped = clamp(units, 0, RUN_UNITS);
  return PHASE_IDS.find((id) => clamped < PHASE_RANGES[id].end) ?? LAST_PHASE;
}

function shareIn({ start, end }: PhaseRange, units: number): number {
  return clamp((units - start) / (end - start), 0, 1);
}

function clockAt(index: number, share: number): number {
  const from = CLOCK_KNOTS[index];
  const to = CLOCK_KNOTS[index + 1];
  return GEOMETRIC_PHASES.has(PHASE_IDS[index])
    ? from * (to / from) ** share
    : lerp(from, to, share);
}

function clockShare(index: number, seconds: number): number {
  const from = CLOCK_KNOTS[index];
  const to = CLOCK_KNOTS[index + 1];
  const share = GEOMETRIC_PHASES.has(PHASE_IDS[index])
    ? Math.log(seconds / from) / Math.log(to / from)
    : (seconds - from) / (to - from);
  return clamp(share, 0, 1);
}

export function realSecondsAt(units: number): number {
  const phase = phaseAt(units);
  return clockAt(PHASE_IDS.indexOf(phase), shareIn(PHASE_RANGES[phase], units));
}

function bandOfSeconds(seconds: number): number {
  const index = PHASE_IDS.findIndex((_, band) => seconds < CLOCK_KNOTS[band + 1]);
  return index === -1 ? PHASE_IDS.length - 1 : index;
}

export function unitsAt(seconds: number): number {
  const clamped = clamp(seconds, CLOCK_KNOTS[0], LAST_KNOT);
  const index = bandOfSeconds(clamped);
  const { start, end } = PHASE_RANGES[PHASE_IDS[index]];
  return lerp(start, end, clockShare(index, clamped));
}

function travelShare(phase: PhaseId, units: number, share: number): number {
  if (phase !== 'compute') return share;
  const range = { start: PHASE_RANGES.compute.start, end: MOMENTS.becomesHeat };
  return shareIn(range, units);
}

export function jouleAt(units: number, cooling: CoolingId): JouleReading {
  const clamped = clamp(units, 0, RUN_UNITS);
  const phase = phaseAt(clamped);
  const share = shareIn(PHASE_RANGES[phase], clamped);
  const legs = legsFor(cooling, phase);
  const travel = travelShare(phase, clamped, share);
  const { position, heading } = pointOnLegs(legs, travel);
  return {
    phase,
    units: clamped,
    share,
    realSeconds: realSecondsAt(clamped),
    position,
    heading,
    form: clamped < MOMENTS.becomesHeat ? 'current' : 'heat',
    carrier: legAt(legs, travel).carrier,
    span: CHASE_SPAN[phase],
  };
}
