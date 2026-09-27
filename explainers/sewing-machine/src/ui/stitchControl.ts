import { requireElement, setText } from '@core/ui/dom';
import { configureRange, showRangeValue } from '@core/ui/range';
import { watchLocalized } from '@core/ui/subscribe';
import { FEED_TIMING, STITCH_LENGTH, fabricTravel, stitchesPerCm } from '../model';
import type { SewingStore } from '../state';
import { formatDensity, formatMillimetres } from './format';

export function mountStitchControl(root: Document, store: SewingStore): void {
  const input = requireElement<HTMLInputElement>(root, '[data-control="stitch-length"]');
  const length = requireElement(root, '[data-readout="stitch-length"]');
  const density = requireElement(root, '[data-readout="stitch-density"]');
  const travel = requireElement(root, '[data-readout="stitch-travel"]');

  configureRange(input, STITCH_LENGTH);
  input.addEventListener('input', () => store.getState().setStitchLength(Number(input.value)));

  watchLocalized(
    store,
    (state) => state.stitchLength,
    (stitchLength) => {
      const lengthText = formatMillimetres(stitchLength);
      showRangeValue(input, stitchLength, lengthText);
      setText(length, lengthText);
      setText(density, formatDensity(stitchesPerCm(stitchLength)));
      setText(travel, formatMillimetres(fabricTravel(FEED_TIMING.dropEnd, stitchLength)));
    },
  );
}
