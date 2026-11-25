import type { Disposer } from '@core/ui/disposers';
import type { RunStore } from '../state';
import { mountFootStrip } from './footStrip';

export function mountRunGauge(gauge: HTMLElement, store: RunStore): Disposer {
  return mountFootStrip(gauge, store);
}
