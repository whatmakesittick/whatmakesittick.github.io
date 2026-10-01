import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { boosterThrustTf } from '../model/performance';
import { engineOf, performanceOf } from '../state';
import type { RaptorState, RaptorStore } from '../state';
import { formatDegrees, formatKmPerHour, formatTonnes } from './format';
import { LaunchView } from './launchView';

function steeringTilt(state: RaptorState): number {
  const { pitch, yaw } = engineOf(state).gimbal;
  return Math.hypot(pitch, yaw);
}

export function mountAscentReadouts(root: Document, store: RaptorStore): Disposer {
  const view = new LaunchView(requireElement<HTMLCanvasElement>(root, '[data-view="launch"]'));
  const unmount = disposeAll([
    mountLiveReadouts(root, store, {
      'ascent-speed': (state) => formatKmPerHour(engineOf(state).speedKmh),
      'ascent-booster': (state) => formatTonnes(boosterThrustTf(performanceOf(state).thrustTf)),
      'ascent-steer': (state) => formatDegrees(steeringTilt(state)),
    }),
    watchLocalized(
      store,
      (state) => state.phase,
      (phase) => view.draw(phase),
    ),
  ]);
  return () => {
    unmount();
    view.dispose();
  };
}
