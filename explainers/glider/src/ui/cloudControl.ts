import { requireElement, setText } from '@core/ui/dom';
import { configureRange, showRangeValue } from '@core/ui/range';
import { watchLocalized } from '@core/ui/subscribe';
import { SPREAD, roundedCloudBase } from '../model';
import type { GliderStore } from '../state';
import { formatCelsius, formatMetres } from './format';

export function mountCloudControl(root: Document, store: GliderStore): void {
  const input = requireElement<HTMLInputElement>(root, '[data-control="spread"]');
  const spread = requireElement(root, '[data-readout="spread"]');
  const base = requireElement(root, '[data-readout="cloud-base"]');

  configureRange(input, SPREAD);
  input.addEventListener('input', () => store.getState().setSpread(Number(input.value)));

  watchLocalized(
    store,
    (state) => state.spread,
    (degrees) => {
      const spreadText = formatCelsius(degrees);
      showRangeValue(input, degrees, spreadText);
      setText(spread, spreadText);
      setText(base, formatMetres(roundedCloudBase(degrees)));
    },
  );
}
