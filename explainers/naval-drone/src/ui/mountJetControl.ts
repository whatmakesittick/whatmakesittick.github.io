import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
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
} from './format';

type SelectedThrottle = readonly [percent: number, helm: HelmId, trialKnots: number | null];

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
      ],
      value: ([percent]) => percent,
      format: ([percent]) => formatPercent(percent / PERCENT),
      set: (state, percent) => state.setThrottle(percent),
      readouts: {
        'jet-boat': (_, state) => formatBoatOrBacking(runAt(state).boat.knots, state.helm),
        'jet-flow': (_, state) => formatFlow(jetOf(state).flow),
        'jet-velocity': (_, state) => formatJetSpeed(jetOf(state).jetSpeed),
        'jet-thrust': (_, state) => formatThrust(jetOf(state).thrust, state.helm),
        'jet-efficiency': (_, state) =>
          formatEfficiency(jetOf(state).efficiency, runAt(state).boat.knots),
      },
    }),
    mountLiveReadouts(root, store, {
      'jet-push': (state) => formatPush(state.helm, jetOf(state).nozzleAngle),
    }),
  ]);
}
