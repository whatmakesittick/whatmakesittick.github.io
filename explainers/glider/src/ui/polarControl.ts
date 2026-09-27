import { requireElement, setText } from '@core/ui/dom';
import { configureRange, showRangeValue } from '@core/ui/range';
import { watchShallowLocalized } from '@core/ui/subscribe';
import { POLAR_SPEED, glideRatio, sinkRate } from '../model';
import type { GliderStore } from '../state';
import { formatRate, formatRatio, formatReach, formatSpeed } from './format';

export function mountPolarControl(root: Document, store: GliderStore): void {
  const input = requireElement<HTMLInputElement>(root, '[data-control="polar-speed"]');
  const speed = requireElement(root, '[data-readout="polar-speed"]');
  const sink = requireElement(root, '[data-readout="polar-sink"]');
  const ratio = requireElement(root, '[data-readout="polar-ratio"]');
  const reach = requireElement(root, '[data-readout="polar-distance"]');

  configureRange(input, POLAR_SPEED);
  input.addEventListener('input', () => store.getState().setPolarSpeed(Number(input.value)));

  watchShallowLocalized(
    store,
    (state) => [state.glider, state.polarSpeed] as const,
    ([type, kmh]) => {
      const speedText = formatSpeed(kmh);
      const glide = glideRatio(type, kmh);
      showRangeValue(input, kmh, speedText);
      setText(speed, speedText);
      setText(sink, formatRate(sinkRate(type, kmh)));
      setText(ratio, formatRatio(glide));
      setText(reach, formatReach(glide));
    },
  );
}
