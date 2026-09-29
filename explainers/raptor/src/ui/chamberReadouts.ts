import type { Disposer } from '@core/ui/disposers';
import { FLAME_TEMPERATURE_K } from '../model/performance';
import { performanceOf } from '../state';
import type { RaptorState, RaptorStore } from '../state';
import {
  formatAboutBar,
  formatAboutKelvin,
  formatKgPerSecond,
  formatKmPerSecond,
  formatOff,
} from './format';
import { mountLiveReadouts } from './liveReadouts';

function whileFiring(state: RaptorState, text: () => string): string {
  return performanceOf(state).firing ? text() : formatOff();
}

export function mountChamberReadouts(root: Document, store: RaptorStore): Disposer {
  return mountLiveReadouts(root, store, {
    'chamber-oxygen': (state) => formatKgPerSecond(performanceOf(state).oxygenFlow),
    'chamber-methane': (state) => formatKgPerSecond(performanceOf(state).methaneFlow),
    'chamber-pressure': (state) =>
      whileFiring(state, () => formatAboutBar(performanceOf(state).chamberPressureBar)),
    'chamber-temperature': (state) =>
      whileFiring(state, () => formatAboutKelvin(FLAME_TEMPERATURE_K)),
    'chamber-speed': (state) =>
      whileFiring(state, () => formatKmPerSecond(performanceOf(state).exhaustSpeedKmS)),
  });
}
