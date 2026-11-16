import type { Phase, Timeline } from '@core/explainer';
import { formatNumber } from '@core/format';
import { t } from '@core/i18n';
import { PHASE_IDS } from './ids';
import type { PhaseId } from './ids';
import {
  CYCLE_UNITS,
  IODATE_RANGE_MM,
  PHASE_RANGES,
  TEMPERATURE_RANGE_C,
  phaseIdAt,
  realAt,
} from './model';
import { REAL_TIME_SPEED, SPEED_RANGE, nominalRate, speedFactor } from './model/playback';
import { switchSecondsOf } from './state/derived';
import type { RecipeSource } from './state/derived';
import { PHASE_TONES } from './theme';
import { formatClockSeconds } from './ui/format';

const SCRUBBER_STEP_UNITS = 1;
const FINE_STEP_UNITS = 5;
const COARSE_STEP_UNITS = 50;

const DEFAULT_RECIPE: RecipeSource = {
  iodateMm: IODATE_RANGE_MM.default,
  temperatureC: TEMPERATURE_RANGE_C.default,
};

export function phaseKey(id: PhaseId): string {
  return `timeline.phase.${id}`;
}

function jumpKey(id: PhaseId): string {
  return `timeline.jump.${id}`;
}

function factorText(factor: number): string {
  return formatNumber(factor);
}

export function formatSpeed(speed: number): string {
  return t('timeline.speedValue', { factor: factorText(speedFactor(speed)) });
}

export function describeSpeed(speed: number): string {
  if (speed === REAL_TIME_SPEED) return t('timeline.realTime');
  const factor = speedFactor(speed);
  if (factor < 1) return t('timeline.slower', { factor: factorText(1 / factor) });
  return t('timeline.faster', { factor: factorText(factor) });
}

const CLOCK_PHASES: readonly Phase[] = PHASE_IDS.map((id) => ({
  id,
  start: PHASE_RANGES[id].start,
  end: PHASE_RANGES[id].end,
  labelKey: phaseKey(id),
  jumpLabelKey: jumpKey(id),
  tone: PHASE_TONES[id],
}));

export function createClockTimeline(getState: () => RecipeSource): Timeline {
  const secondsAt = (units: number) => {
    const switchAt = switchSecondsOf(getState());
    return formatClockSeconds(realAt(units, switchAt), switchAt);
  };
  return {
    cycle: CYCLE_UNITS,
    loop: false,
    step: SCRUBBER_STEP_UNITS,
    nudge: { fine: FINE_STEP_UNITS, coarse: COARSE_STEP_UNITS },
    labelKey: 'timeline.label',
    phasesLabelKey: 'timeline.phases',
    formatPhase: (units) => t('timeline.value', { seconds: secondsAt(units) }),
    describePhase: (units) =>
      t('timeline.during', { seconds: secondsAt(units), phase: t(phaseKey(phaseIdAt(units))) }),
    formatInputs: () => [switchSecondsOf(getState())],
    rate: nominalRate,
    phases: CLOCK_PHASES,
    speed: {
      min: SPEED_RANGE.min,
      max: SPEED_RANGE.max,
      step: SPEED_RANGE.step,
      labelKey: 'timeline.speed',
      format: formatSpeed,
      describe: describeSpeed,
    },
  };
}

export const CLOCK_TIMELINE_BASE: Timeline = createClockTimeline(() => DEFAULT_RECIPE);
