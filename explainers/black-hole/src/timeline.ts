import type { Phase, Timeline } from '@core/explainer';
import { formatFixed, formatNumber } from '@core/format';
import { t } from '@core/i18n';

export const SPEED_RANGE = { min: 0.25, max: 4, step: 0.25, default: 1 } as const;

const CYCLE_SECONDS = 120;
const SCRUBBER_STEP_SECONDS = 0.1;
const FINE_STEP_SECONDS = 1;
const COARSE_STEP_SECONDS = 10;
const WHOLE_SECONDS = 0;

const ORBIT_PHASE: Phase = {
  id: 'orbit',
  start: 0,
  end: CYCLE_SECONDS,
  labelKey: 'timeline.phase.orbit',
  jumpLabelKey: 'timeline.jump.orbit',
  tone: 'var(--orbit)',
};

function formatPhase(phase: number): string {
  return t('timeline.value', { seconds: formatFixed(phase, WHOLE_SECONDS) });
}

function formatSpeed(speed: number): string {
  return t('timeline.times', { factor: formatNumber(speed) });
}

export const BLACK_HOLE_TIMELINE: Timeline = {
  cycle: CYCLE_SECONDS,
  loop: true,
  step: SCRUBBER_STEP_SECONDS,
  nudge: { fine: FINE_STEP_SECONDS, coarse: COARSE_STEP_SECONDS },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase,
  describePhase: formatPhase,
  rate: (speed) => speed,
  phases: [ORBIT_PHASE],
  speed: {
    min: SPEED_RANGE.min,
    max: SPEED_RANGE.max,
    step: SPEED_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpeed,
    describe: formatSpeed,
  },
};
