import type { MomentId, PhaseId } from '../ids';
import { DEFAULT_PACE } from './paces';
import { phaseBounds } from './phases';
import { CYCLE_UNITS } from './playback';

export { CYCLE_UNITS, wrapUnits } from './playback';

const MIDDLE = phaseBounds(DEFAULT_PACE);

function rounded(units: number): number {
  return Math.round(units);
}

export const PHASE_RANGES: Readonly<Record<PhaseId, { start: number; end: number }>> = {
  entryCatch: { start: 0, end: rounded(MIDDLE.entryCatch[1]) },
  pull: { start: rounded(MIDDLE.pull[0]), end: rounded(MIDDLE.pull[1]) },
  push: { start: rounded(MIDDLE.push[0]), end: rounded(MIDDLE.push[1]) },
  recovery: { start: rounded(MIDDLE.recovery[0]), end: CYCLE_UNITS },
};

const RECOVERY_MID_SHARE = 0.5;

export const MOMENTS: Readonly<Record<MomentId, number>> = {
  entry: 0,
  catch: PHASE_RANGES.pull.start,
  underShoulder: PHASE_RANGES.push.start,
  pushEnd: PHASE_RANGES.recovery.start,
  recoveryMid: Math.round(
    PHASE_RANGES.recovery.start +
      (PHASE_RANGES.recovery.end - PHASE_RANGES.recovery.start) * RECOVERY_MID_SHARE,
  ),
};
