import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { totalMagnification } from '../model';
import type { MicroscopeStore } from '../state';
import { formatTimes } from './format';

export function mountTotalMagnification(root: Document, store: MicroscopeStore): void {
  const readout = requireElement(root, '[data-readout="total-magnification"]');
  watchLocalized(
    store,
    (state) => totalMagnification(state.objective, state.eyepiece),
    (total) => setText(readout, formatTimes(total)),
  );
}
