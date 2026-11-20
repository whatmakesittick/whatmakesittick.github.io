import type { Disposer } from '@core/ui/disposers';
import type { SwimStore } from '../state';
import { mountArmStrip } from './armStrip';

export function mountSwimGauge(gauge: HTMLElement, store: SwimStore): Disposer {
  return mountArmStrip(gauge, store);
}
