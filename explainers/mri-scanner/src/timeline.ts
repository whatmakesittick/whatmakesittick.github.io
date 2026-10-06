import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { MOMENT_IDS, PHASE_IDS } from './ids';
import type { MomentId, PhaseId } from './ids';
import { CYCLE_UNITS, MOMENTS, PHASE_RANGES, SPEED_RANGE, phaseOf, rate } from './model';
import { PHASE_TONES } from './theme';

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

function phaseName(phase: number): string {
  return t(phaseKey(phaseOf(phase)));
}

function stepCount(phase: number): { step: string; total: string } {
  return {
    step: formatNumber(PHASE_IDS.indexOf(phaseOf(phase)) + 1),
    total: formatNumber(PHASE_IDS.length),
  };
}

export function formatPhase(phase: number): string {
  return t('timeline.value', stepCount(phase));
}

export function describePhase(phase: number): string {
  return t('timeline.during', { ...stepCount(phase), phase: phaseName(phase) });
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { value: formatNumber(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.speedFormat', { value: formatNumber(speed) });
}

export function momentAt(phase: number): MomentId | null {
  return MOMENT_IDS.find((id) => MOMENTS[id] === phase) ?? null;
}

const SEQUENCE_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id][0],
  end: PHASE_RANGES[id][1],
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export const MRI_SCANNER_TIMELINE: Timeline = {
  cycle: CYCLE_UNITS,
  loop: true,
  step: SCRUBBER_STEP_UNITS,
  nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: SEQUENCE_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
