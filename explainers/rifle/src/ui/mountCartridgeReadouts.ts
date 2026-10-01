import type { Disposer } from '@core/ui/disposers';
import { cycleOf } from '../state';
import type { RifleStore } from '../state';
import { formatMm, formatPressure, formatTimesAir } from './format';
import { mountLiveReadouts } from './liveReadouts';

export function mountCartridgeReadouts(root: Document, store: RifleStore): Disposer {
  return mountLiveReadouts(root, store, {
    'cartridge-pressure': (state) => formatPressure(cycleOf(state).shot.pressure),
    'cartridge-air': (state) => formatTimesAir(cycleOf(state).shot.pressure),
    'cartridge-travel': (state) => formatMm(cycleOf(state).shot.travel),
  });
}
