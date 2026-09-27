import { mountRangeWidget } from '@core/ui/rangeWidget';
import { FEED_TIMING, STITCH_LENGTH, fabricTravel, stitchesPerCm } from '../model';
import type { SewingStore } from '../state';
import { formatDensity, formatMillimetres } from './format';

export function mountStitchControl(root: Document, store: SewingStore): void {
  mountRangeWidget(root, store, {
    control: 'stitch-length',
    range: STITCH_LENGTH,
    select: (state) => [state.stitchLength] as const,
    value: ([length]) => length,
    format: ([length]) => formatMillimetres(length),
    set: (state, length) => state.setStitchLength(length),
    readouts: {
      'stitch-density': ([length]) => formatDensity(stitchesPerCm(length)),
      'stitch-travel': ([length]) => formatMillimetres(fabricTravel(FEED_TIMING.dropEnd, length)),
    },
  });
}
