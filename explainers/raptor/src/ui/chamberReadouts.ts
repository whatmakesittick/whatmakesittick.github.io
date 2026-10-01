import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { FLAME_TEMPERATURE_K } from '../model/performance';
import { performanceOf } from '../state';
import type { RaptorStore } from '../state';
import {
  formatAboutBar,
  formatAboutKelvin,
  formatKgPerSecond,
  formatKmPerSecond,
  unlessOff,
} from './format';

export function mountChamberReadouts(root: Document, store: RaptorStore): Disposer {
  return mountLiveReadouts(root, store, {
    'chamber-oxygen': (state) => {
      const { firing, oxygenFlow } = performanceOf(state);
      return unlessOff(firing, () => formatKgPerSecond(oxygenFlow));
    },
    'chamber-methane': (state) => {
      const { firing, methaneFlow } = performanceOf(state);
      return unlessOff(firing, () => formatKgPerSecond(methaneFlow));
    },
    'chamber-pressure': (state) => {
      const { firing, chamberPressureBar } = performanceOf(state);
      return unlessOff(firing, () => formatAboutBar(chamberPressureBar));
    },
    'chamber-temperature': (state) =>
      unlessOff(performanceOf(state).firing, () => formatAboutKelvin(FLAME_TEMPERATURE_K)),
    'chamber-speed': (state) => {
      const { steady, exhaustSpeedKmS } = performanceOf(state);
      return unlessOff(steady, () => formatKmPerSecond(exhaustSpeedKmS));
    },
  });
}
