import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import { formatClock, phaseAt } from '../model';
import type { PhaseId } from '../model';

export const PHASE_KEYS: Record<PhaseId, string> = {
  thermal: 'timeline.phase.thermal',
  glide: 'timeline.phase.glide',
  ridge: 'timeline.phase.ridge',
  wave: 'timeline.phase.wave',
  final: 'timeline.phase.final',
};

const DURING_KEYS: Record<PhaseId, string> = {
  thermal: 'timeline.during.thermal',
  glide: 'timeline.during.glide',
  ridge: 'timeline.during.ridge',
  wave: 'timeline.during.wave',
  final: 'timeline.during.final',
};

export function describeFlightTime(phase: number): string {
  return t('timeline.value', { time: formatClock(phase), phase: t(DURING_KEYS[phaseAt(phase)]) });
}

export function formatTimeLapse(speed: number): string {
  return t('units.times', { value: formatFixed(speed, 0) });
}

export function describeTimeLapse(speed: number): string {
  return t('timeline.speedValue', { value: formatFixed(speed, 0) });
}
