import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { PROPELLANTS, propellantFlow, toCelsius } from '../model/propellants';
import { engineOf } from '../state';
import type { RaptorState, RaptorStore } from '../state';
import {
  formatKelvinCelsius,
  formatKgPerSecond,
  formatPercent,
  formatRoute,
  unlessOff,
} from './format';

function boilsAt(state: RaptorState): string {
  const { boilsAtK } = PROPELLANTS[state.propellant];
  return formatKelvinCelsius(boilsAtK, toCelsius(boilsAtK));
}

export function mountPropellantReadouts(root: Document, store: RaptorStore): Disposer {
  return mountLiveReadouts(root, store, {
    'propellant-boils': boilsAt,
    'propellant-share': (state) => formatPercent(PROPELLANTS[state.propellant].massShare),
    'propellant-flow': (state) => {
      const { throttle } = engineOf(state);
      return unlessOff(throttle > 0, () =>
        formatKgPerSecond(propellantFlow(state.propellant, throttle)),
      );
    },
    'propellant-route': (state) => formatRoute(state.propellant),
  });
}
