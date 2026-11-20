import type { PhaseId } from '../ids';
import { PHASE_IDS } from '../ids';
import type { PaceId } from '../ids';
import { PACES } from './paces';
import { CYCLE_UNITS, wrapUnits } from './playback';

export type PhaseBounds = Readonly<Record<PhaseId, readonly [start: number, end: number]>>;

const HALF_CYCLE_UNITS = CYCLE_UNITS / 2;
const UNITS_PER_PERCENT = CYCLE_UNITS / 100;

const FLUME_SHARE: Readonly<Record<PhaseId, number>> = {
  entryCatch: 28,
  pull: 25,
  push: 23,
  recovery: 24,
};

const NONPROPULSIVE_SHARE = FLUME_SHARE.entryCatch + FLUME_SHARE.recovery;
const PROPULSIVE_SHARE = FLUME_SHARE.pull + FLUME_SHARE.push;

export function propulsiveUnits(pace: PaceId): number {
  return HALF_CYCLE_UNITS + UNITS_PER_PERCENT * PACES[pace].idcPercent;
}

export function phaseBounds(pace: PaceId): PhaseBounds {
  const propulsive = propulsiveUnits(pace);
  const rest = CYCLE_UNITS - propulsive;
  const entryCatchEnd = (rest * FLUME_SHARE.entryCatch) / NONPROPULSIVE_SHARE;
  const pullEnd = entryCatchEnd + (propulsive * FLUME_SHARE.pull) / PROPULSIVE_SHARE;
  const pushEnd = pullEnd + (propulsive * FLUME_SHARE.push) / PROPULSIVE_SHARE;
  return {
    entryCatch: [0, entryCatchEnd],
    pull: [entryCatchEnd, pullEnd],
    push: [pullEnd, pushEnd],
    recovery: [pushEnd, CYCLE_UNITS],
  };
}

export interface PhasePosition {
  phase: PhaseId;
  progress: number;
}

export function phaseAt(units: number, pace: PaceId): PhasePosition {
  const wrapped = wrapUnits(units);
  const bounds = phaseBounds(pace);
  const phase = PHASE_IDS.find((id) => wrapped < bounds[id][1]) ?? 'recovery';
  const [start, end] = bounds[phase];
  return { phase, progress: (wrapped - start) / (end - start) };
}
