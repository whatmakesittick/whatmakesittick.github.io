import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { secondsPerStitch } from '../model';
import type { PhaseId, Tension } from '../model';

const TENTHS = 10;

export const PHASE_KEYS: Record<PhaseId, string> = {
  feed: 'timeline.phase.feed',
  pierce: 'timeline.phase.pierce',
  loop: 'timeline.phase.loop',
  wrap: 'timeline.phase.wrap',
  set: 'timeline.phase.set',
};

export const TENSION_KEYS: Record<Tension, string> = {
  loose: 'controls.tensionOptions.loose',
  balanced: 'controls.tensionOptions.balanced',
  tight: 'controls.tensionOptions.tight',
};

export function phaseLabel(phase: PhaseId): string {
  return t(PHASE_KEYS[phase]);
}

export function formatDegrees(degrees: number): string {
  return t('units.degrees', { value: formatFixed(Math.floor(degrees), 0) });
}

export function formatMillimetres(millimetres: number): string {
  return t('units.mm', { value: formatFixed(millimetres, 1) });
}

export function formatSpm(stitchesPerMinute: number): string {
  return t('units.spm', { value: formatFixed(stitchesPerMinute, 0) });
}

export function describeSpm(stitchesPerMinute: number): string {
  return t('timeline.speedValue', { value: formatFixed(secondsPerStitch(stitchesPerMinute), 1) });
}

export function formatDensity(count: number): string {
  return formatNumber(Math.round(count * TENTHS) / TENTHS);
}
