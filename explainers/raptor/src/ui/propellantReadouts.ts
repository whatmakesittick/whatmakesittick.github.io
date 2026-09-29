import type { Disposer } from '@core/ui/disposers';
import { PROPELLANTS, propellantFlow, toCelsius } from '../model/propellants';
import { engineOf } from '../state';
import type { RaptorState, RaptorStore } from '../state';
import { formatKelvinCelsius, formatKgPerSecond, formatPercent, formatRoute } from './format';
import { mountLiveReadouts } from './liveReadouts';

function boilsAt(state: RaptorState): string {
  const { boilsAtK } = PROPELLANTS[state.propellant];
  return formatKelvinCelsius(boilsAtK, toCelsius(boilsAtK));
}

export function mountPropellantReadouts(root: Document, store: RaptorStore): Disposer {
  return mountLiveReadouts(root, store, {
    'propellant-boils': boilsAt,
    'propellant-share': (state) => formatPercent(PROPELLANTS[state.propellant].massShare),
    'propellant-flow': (state) =>
      formatKgPerSecond(propellantFlow(state.propellant, engineOf(state).throttle)),
    'propellant-route': (state) => formatRoute(state.propellant),
  });
}
