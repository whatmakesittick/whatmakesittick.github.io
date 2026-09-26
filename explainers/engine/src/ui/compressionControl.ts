import { queryAll, requireElement, setText } from '@core/ui/dom';
import { parseOption } from '@core/ui/parse';
import { configureRange, rangeFraction, showRangeValue, toPercent } from '@core/ui/range';
import { watch, watchShallowLocalized } from '@core/ui/subscribe';
import {
  COMPRESSION_RATIO_RANGE,
  ENGINE_TYPES,
  clearanceHeight,
  peakMotoredPressure,
} from '../model';
import type { EngineType } from '../model';
import { currentSpec } from '../state';
import type { EngineStore } from '../state';
import { formatMillimetres, formatPressure, formatRatio } from './format';

const TYPICAL_RATIOS: Record<EngineType, { min: number; max: number }> = {
  petrol: { min: 9, max: 13 },
  diesel: { min: 14, max: 22 },
};

function paintTypicalBands(bands: HTMLElement[]): void {
  for (const band of bands) {
    const { min, max } = TYPICAL_RATIOS[parseOption(band.dataset.band, ENGINE_TYPES)];
    band.style.setProperty('--from', toPercent(rangeFraction(min, COMPRESSION_RATIO_RANGE)));
    band.style.setProperty('--to', toPercent(rangeFraction(max, COMPRESSION_RATIO_RANGE)));
  }
}

export function mountCompressionControl(root: Document, store: EngineStore): void {
  const input = requireElement<HTMLInputElement>(root, '[data-control="compression"]');
  const ratio = requireElement(root, '[data-readout="compression-ratio"]');
  const clearance = requireElement(root, '[data-readout="clearance"]');
  const pressure = requireElement(root, '[data-readout="compression-pressure"]');
  const bands = queryAll(root, '[data-band]');

  configureRange(input, COMPRESSION_RATIO_RANGE);
  paintTypicalBands(bands);
  input.addEventListener('input', () => store.getState().setCompressionRatio(Number(input.value)));

  watchShallowLocalized(
    store,
    (state) => [state.engineType, state.compressionRatio] as const,
    () => {
      const spec = currentSpec(store.getState());
      const ratioText = formatRatio(spec.compressionRatio);
      showRangeValue(input, spec.compressionRatio, ratioText);
      setText(ratio, ratioText);
      setText(clearance, formatMillimetres(clearanceHeight(spec)));
      setText(pressure, formatPressure(peakMotoredPressure(spec)));
    },
  );
  watch(
    store,
    (state) => state.engineType,
    (type) => bands.forEach((band) => (band.dataset.active = String(band.dataset.band === type))),
  );
}
