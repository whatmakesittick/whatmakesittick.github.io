import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TEXT_REFRESH_INTERVAL_MS } from '@core/ui/throttle';
import type { HelmId } from '../ids';
import { THROTTLE_PERCENT, throttleAt, throttlePercentOf } from '../model';
import { followedKnots, runAt } from '../state';
import type { NavalDroneStore, NavalDroneStoreState } from '../state';
import {
  formatBoatOrBacking,
  formatEfficiency,
  formatFlow,
  formatJetSpeed,
  formatPercent,
  formatPush,
  formatThrust,
  shownKnots,
} from './format';

type SelectedThrottle = readonly [
  percent: number,
  helm: HelmId,
  trialKnots: number | null,
  knots: number,
];

const PERCENT = 100;

function jetOf(state: NavalDroneStoreState) {
  return runAt(state).jet;
}

export function mountJetControl(root: Document, store: NavalDroneStore): Disposer {
  return disposeAll([
    mountRangeWidget(root, store, {
      control: 'throttle',
      range: THROTTLE_PERCENT,
      select: (state): SelectedThrottle => [
        throttlePercentOf(throttleAt(followedKnots(state))),
        state.helm,
        state.trialKnots,
        shownKnots(runAt(state).boat.knots),
      ],
      value: ([percent]) => percent,
      format: ([percent]) => formatPercent(percent / PERCENT),
      set: (state, percent) => state.setThrottle(percent),
      refreshIntervalMs: TEXT_REFRESH_INTERVAL_MS,
      readouts: {
        'jet-boat': ([, helm, , knots]) => formatBoatOrBacking(knots, helm),
        'jet-flow': (_, state) => formatFlow(jetOf(state).flow),
        'jet-velocity': (_, state) => formatJetSpeed(jetOf(state).jetSpeed),
        'jet-thrust': (_, state) => formatThrust(jetOf(state).thrust, state.helm),
        'jet-efficiency': ([, , , knots], state) =>
          formatEfficiency(jetOf(state).efficiency, knots),
      },
    }),
    mountLiveReadouts(root, store, {
      'jet-push': (state) => formatPush(state.helm, jetOf(state).nozzleAngle),
    }),
  ]);
}
