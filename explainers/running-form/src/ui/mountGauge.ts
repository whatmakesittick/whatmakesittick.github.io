import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { RunStore } from '../state';
import { mountFootStrip } from './footStrip';
import { mountPaceLabels } from './paceLabels';

export function mountRunGauge(gauge: HTMLElement, store: RunStore): Disposer {
  return disposeAll([mountFootStrip(gauge, store), mountPaceLabels(gauge)]);
}
