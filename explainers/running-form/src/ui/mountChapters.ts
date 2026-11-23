import { t } from '@core/i18n';
import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { GAIT_DATA, STEP_RATE_RANGE } from '../model';
import { gaitReading } from '../state';
import type { RunStore, RunStoreState } from '../state';
import { chapterOf } from './chapters';
import {
  formatBodyWeights,
  formatBodyWeightsDetailed,
  formatCentimeters,
  formatDegrees,
  formatDegreesSigned,
  formatLength,
  formatMeters,
  formatMetersPerSecond,
  formatMilliseconds,
  formatPerKilometer,
  formatPerMinute,
  formatPercentOfShare,
  formatPercentSigned,
  formatRate,
  formatSpeed,
} from './format';
import {
  brakeImpulseChangePercent,
  peakBrakingBW,
  peakVerticalBW,
  phaseText,
  reachChangeText,
  touchdownKneeDeg,
  trunkTwistRange,
} from './text';

const reading = (state: RunStoreState) => gaitReading(state);
const timing = (state: RunStoreState) => reading(state).timing;

const pacingReadouts = (prefix: 'stride' | 'land' | 'lift' | 'pace') => ({
  [`${prefix}Cadence`]: (state: RunStoreState) => formatPerMinute(timing(state).cadence),
  [`${prefix}Step`]: (state: RunStoreState) => formatMeters(timing(state).stepLengthM),
});

function mountStride(root: Document, store: RunStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'stride'), store, {
    ...pacingReadouts('stride'),
    strideSpeed: (state) => formatMetersPerSecond(timing(state).speedMs),
    strideSum: (state) =>
      t('chapters.stride.sumValue', {
        cadence: formatRate(timing(state).cadence),
        step: formatLength(timing(state).stepLengthM),
        speed: formatSpeed(timing(state).speedMs),
      }),
    stridePhase: (state) => phaseText(reading(state).right),
    strideFloat: (state) => formatPercentOfShare(timing(state).floatShare),
  });
}

function mountStepRate(chapter: HTMLElement, store: RunStore): Disposer {
  return mountRangeWidget(chapter, store, {
    control: 'stepRate',
    range: STEP_RATE_RANGE,
    select: (state) => [state.stepRate] as const,
    value: ([stepRate]) => stepRate,
    format: ([stepRate]) => formatPercentSigned(stepRate),
    set: (state, stepRate) => state.setStepRate(stepRate),
  });
}

function mountTouchdown(root: Document, store: RunStore): Disposer {
  const chapter = chapterOf(root, 'touchdown');
  return disposeAll([
    mountStepRate(chapter, store),
    mountLiveReadouts(chapter, store, {
      ...pacingReadouts('land'),
      landRate: (state) => formatPercentSigned(state.stepRate),
      landReach: (state) => reachChangeText(state.stepRate),
      landKnee: (state) => formatDegrees(touchdownKneeDeg(state)),
      landBrake: (state) => formatBodyWeightsDetailed(peakBrakingBW(state.pace, state.stepRate)),
      landBrakeImpulse: (state) => formatPercentSigned(brakeImpulseChangePercent(state.stepRate)),
    }),
  ]);
}

function mountSpring(root: Document, store: RunStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'spring'), store, {
    springForce: (state) => formatBodyWeights(reading(state).force.vertBW),
    springKnee: (state) => formatDegrees(reading(state).right.kneeFlexDeg),
    springPeak: (state) => formatBodyWeightsDetailed(peakVerticalBW(state.pace, state.stepRate)),
    springContact: (state) => formatMilliseconds(timing(state).contactTimeS),
    springPhase: (state) => phaseText(reading(state).right),
  });
}

function mountLiftoff(root: Document, store: RunStore): Disposer {
  const chapter = chapterOf(root, 'liftoff');
  return disposeAll([
    mountStepRate(chapter, store),
    mountLiveReadouts(chapter, store, {
      ...pacingReadouts('lift'),
      liftRate: (state) => formatPercentSigned(state.stepRate),
      liftBounce: (state) => formatCentimeters(reading(state).com.risePeakToPeakM),
      liftFlight: (state) => formatMilliseconds(timing(state).flightTimeS),
      liftHip: (state) => formatDegreesSigned(reading(state).right.hipFlexDeg),
    }),
  ]);
}

function mountPosture(root: Document, store: RunStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'posture'), store, {
    postureLean: (state) => formatDegrees(reading(state).upper.leanDeg),
    postureTwist: (state) => formatDegrees(trunkTwistRange(state.pace, state.arms)),
    postureElbow: (state) => formatDegrees(reading(state).upper.elbowDeg.right),
    postureArm: (state) => formatDegreesSigned(reading(state).upper.shoulderFlexDeg.right),
    postureArms: (state) => t(`controls.armsOptions.${state.arms}`),
  });
}

function mountPace(root: Document, store: RunStore): Disposer {
  return mountLiveReadouts(chapterOf(root, 'pace'), store, {
    ...pacingReadouts('pace'),
    paceSpeed: (state) => formatMetersPerSecond(timing(state).speedMs),
    paceKm: (state) => formatPerKilometer(timing(state).speedMs),
    paceContact: (state) => formatMilliseconds(timing(state).contactTimeS),
    paceFloat: (state) => formatMilliseconds(timing(state).flightTimeS),
    paceKnee: (state) => formatDegrees(GAIT_DATA[state.pace].kneeSwingPeakDeg),
    paceForce: (state) => formatBodyWeightsDetailed(GAIT_DATA[state.pace].peakVerticalBW),
    paceLean: (state) => formatDegrees(reading(state).upper.leanDeg),
  });
}

export function mountRunUi(root: Document, store: RunStore): Disposer {
  return disposeAll([
    mountStride(root, store),
    mountTouchdown(root, store),
    mountSpring(root, store),
    mountLiftoff(root, store),
    mountPosture(root, store),
    mountPace(root, store),
  ]);
}
