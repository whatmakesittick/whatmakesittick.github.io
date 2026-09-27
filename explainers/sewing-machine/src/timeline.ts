import type { Phase, Timeline } from '@core/explainer';
import { t } from '@core/i18n';
import { PHASE_IDS, PHASE_RANGES, STITCH_CYCLE, degreesPerSecond, phaseAt } from './model';
import type { PhaseId } from './model';
import { PHASE_KEYS, describeSpm, formatDegrees, formatSpm, phaseLabel } from './ui/format';
import { PHASE_TONES } from './ui/palette';

export const SPM_RANGE = { min: 5, max: 120, default: 20, step: 5 } as const;

const SCRUBBER_STEP_DEGREES = 1;
const FINE_STEP_DEGREES = 2;
const COARSE_STEP_DEGREES = 15;

const JUMP_KEYS: Record<PhaseId, string> = {
  feed: 'timeline.jump.feed',
  pierce: 'timeline.jump.pierce',
  loop: 'timeline.jump.loop',
  wrap: 'timeline.jump.wrap',
  set: 'timeline.jump.set',
};

const STITCH_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: PHASE_KEYS[id],
  jumpLabelKey: JUMP_KEYS[id],
  tone: PHASE_TONES[id],
}));

function describeAngle(angle: number): string {
  return t('timeline.value', { angle: formatDegrees(angle), phase: phaseLabel(phaseAt(angle)) });
}

export const SEWING_TIMELINE: Timeline = {
  cycle: STITCH_CYCLE,
  step: SCRUBBER_STEP_DEGREES,
  nudge: { fine: FINE_STEP_DEGREES, coarse: COARSE_STEP_DEGREES },
  labelKey: 'timeline.label',
  phasesLabelKey: 'timeline.phases',
  formatPhase: formatDegrees,
  describePhase: describeAngle,
  rate: degreesPerSecond,
  phases: STITCH_PHASES,
  speed: {
    min: SPM_RANGE.min,
    max: SPM_RANGE.max,
    step: SPM_RANGE.step,
    labelKey: 'timeline.speed',
    format: formatSpm,
    describe: describeSpm,
  },
};
