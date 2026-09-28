import { formatFixed } from '@core/format';
import { t } from '@core/i18n';
import { phaseAt } from '../model';
import type { PhaseId } from '../model';

export const PHASE_KEYS: Record<PhaseId, string> = {
  deck: 'timeline.phase.deck',
  sea: 'timeline.phase.sea',
  topHole: 'timeline.phase.topHole',
  overburden: 'timeline.phase.overburden',
  seal: 'timeline.phase.seal',
  reservoir: 'timeline.phase.reservoir',
  bottom: 'timeline.phase.bottom',
};

export const JUMP_KEYS: Record<PhaseId, string> = {
  deck: 'timeline.jump.deck',
  sea: 'timeline.jump.sea',
  topHole: 'timeline.jump.topHole',
  overburden: 'timeline.jump.overburden',
  seal: 'timeline.jump.seal',
  reservoir: 'timeline.jump.reservoir',
  bottom: 'timeline.jump.bottom',
};

const DURING_KEYS: Record<PhaseId, string> = {
  deck: 'timeline.during.deck',
  sea: 'timeline.during.sea',
  topHole: 'timeline.during.topHole',
  overburden: 'timeline.during.overburden',
  seal: 'timeline.during.seal',
  reservoir: 'timeline.during.reservoir',
  bottom: 'timeline.during.bottom',
};

export function formatMetres(metres: number): string {
  return t('units.m', { value: formatFixed(Math.floor(metres), 0) });
}

export function describeDepth(metres: number): string {
  return t('timeline.value', {
    depth: formatMetres(metres),
    phase: t(DURING_KEYS[phaseAt(metres)]),
  });
}

export function formatSpeed(metresPerSecond: number): string {
  return t('units.metresPerSecond', { value: formatFixed(metresPerSecond, 0) });
}

export function describeSpeed(metresPerSecond: number): string {
  return t('timeline.speedValue', { value: formatFixed(metresPerSecond, 0) });
}
