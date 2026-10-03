import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TRIAL_KNOTS, planingAt, trialKnotsOf } from '../model';
import { followedKnots } from '../state';
import type { NavalDroneStore } from '../state';
import {
  formatBoatSpeed,
  formatDegrees,
  formatHullRatio,
  formatLift,
  formatMode,
  formatWetted,
} from './format';
import { inChapter } from './actions';

type SelectedSpeed = readonly [knots: number];

function planingOf([knots]: SelectedSpeed) {
  return planingAt(knots);
}

export function mountHullControl(root: Document, store: NavalDroneStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'trial-knots',
    range: TRIAL_KNOTS,
    select: (state): SelectedSpeed => [trialKnotsOf(followedKnots(state))],
    value: ([knots]) => knots,
    format: ([knots]) => formatBoatSpeed(knots),
    set: inChapter('hull', (state, knots: number) => state.setTrialKnots(knots)),
    readouts: {
      'hull-mode': (selected) => formatMode(planingOf(selected).mode),
      'hull-trim': (selected) => formatDegrees(planingOf(selected).trim),
      'hull-lift': (selected) => formatLift(planingOf(selected).liftShare),
      'hull-wetted': (selected) => formatWetted(planingOf(selected).wettedLength),
      'hull-ratio': ([knots]) => formatHullRatio(knots),
    },
  });
}
