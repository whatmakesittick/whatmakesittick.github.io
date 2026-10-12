import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import {
  CYCLE_DEG,
  PHASE_RANGES,
  SPEED_RANGE,
  phaseOf,
  rate,
  slowMotion,
  turnPercent,
} from './model';
import { PHASE_TONES } from './theme';

const SCRUBBER_STEP_DEG = 1;
const FINE_STEP_DEG = 5;
const COARSE_STEP_DEG = 30;

function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

export function turnShare(angle: number): string {
  return formatNumber(Math.round(turnPercent(angle)));
}

export function formatPhase(angle: number): string {
  return t('timeline.value', { share: turnShare(angle) });
}

export function describePhase(angle: number): string {
  return t('timeline.during', { share: turnShare(angle), phase: t(phaseKey(phaseOf(angle))) });
}

function factorOf(speed: number): string {
  return formatNumber(slowMotion(speed));
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: factorOf(speed) });
}

export function describeSpeed(speed: number): string {
  return t('timeline.slower', { factor: factorOf(speed) });
}

const TURN_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id][0],
  end: PHASE_RANGES[id][1],
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export const CHAINSAW_TIMELINE: Timeline = {
  cycle: CYCLE_DEG,
  loop: true,
  step: SCRUBBER_STEP_DEG,
  nudge: { fine: FINE_STEP_DEG, coarse: COARSE_STEP_DEG },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase,
  rate,
  phases: TURN_PHASES,
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: describeSpeed,
  },
};
