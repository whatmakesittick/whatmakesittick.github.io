import type { MomentId, PaceId, PhaseId } from '../ids';
import { GAIT_DATA } from './gaitData';
import { DEFAULT_PACE } from './paces';
import { CYCLE_UNITS, wrapUnits } from './playback';

export { CYCLE_UNITS, unitsDelta, wrapUnits } from './playback';

export const HALF_CYCLE_UNITS = CYCLE_UNITS / 2;

type PhaseBounds = Readonly<Record<PhaseId, readonly [start: number, end: number]>>;

export function phaseBounds(pace: PaceId): PhaseBounds {
  const { midStanceUnits, toeOffUnits, midSwingUnits } = GAIT_DATA[pace];
  return {
    landing: [0, midStanceUnits],
    pushOff: [midStanceUnits, toeOffUnits],
    recovery: [toeOffUnits, midSwingUnits],
    reach: [midSwingUnits, CYCLE_UNITS],
  };
}

export function phaseAt(units: number, pace: PaceId): PhaseId {
  const { midStanceUnits, toeOffUnits, midSwingUnits } = GAIT_DATA[pace];
  const wrapped = wrapUnits(units);
  if (wrapped < midStanceUnits) return 'landing';
  if (wrapped < toeOffUnits) return 'pushOff';
  if (wrapped < midSwingUnits) return 'recovery';
  return 'reach';
}

const NOMINAL = phaseBounds(DEFAULT_PACE);

export const PHASE_RANGES: Readonly<Record<PhaseId, { start: number; end: number }>> = {
  landing: { start: NOMINAL.landing[0], end: NOMINAL.landing[1] },
  pushOff: { start: NOMINAL.pushOff[0], end: NOMINAL.pushOff[1] },
  recovery: { start: NOMINAL.recovery[0], end: NOMINAL.recovery[1] },
  reach: { start: NOMINAL.reach[0], end: NOMINAL.reach[1] },
};

export function momentAt(pace: PaceId, id: MomentId): number {
  const data = GAIT_DATA[pace];
  const moments: Readonly<Record<MomentId, number>> = {
    touchdown: 0,
    peakForce: data.forcePeakUnits,
    midStance: data.midStanceUnits,
    toeOff: data.toeOffUnits,
    midFloat: Math.floor((data.toeOffUnits + HALF_CYCLE_UNITS) / 2),
    leftTouchdown: HALF_CYCLE_UNITS,
    midSwing: data.midSwingUnits,
  };
  return moments[id];
}

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  touchdown: momentAt(DEFAULT_PACE, 'touchdown'),
  peakForce: momentAt(DEFAULT_PACE, 'peakForce'),
  midStance: momentAt(DEFAULT_PACE, 'midStance'),
  toeOff: momentAt(DEFAULT_PACE, 'toeOff'),
  midFloat: momentAt(DEFAULT_PACE, 'midFloat'),
  leftTouchdown: momentAt(DEFAULT_PACE, 'leftTouchdown'),
  midSwing: momentAt(DEFAULT_PACE, 'midSwing'),
};
