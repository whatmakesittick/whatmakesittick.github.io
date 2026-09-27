import { queryAll } from '@core/ui/dom';
import { parseOption } from '@core/ui/parse';
import { rangeFraction, toPercent } from '@core/ui/range';
import { mountRangeWidget } from '@core/ui/rangeWidget';
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

function markActiveBand(bands: HTMLElement[], type: EngineType): void {
  bands.forEach((band) => (band.dataset.active = String(band.dataset.band === type)));
}

export function mountCompressionControl(root: Document, store: EngineStore): void {
  const bands = queryAll(root, '[data-band]');
  paintTypicalBands(bands);

  mountRangeWidget(root, store, {
    control: 'compression',
    range: COMPRESSION_RATIO_RANGE,
    select: (state) => [state.engineType, state.compressionRatio] as const,
    value: ([, ratio]) => ratio,
    format: ([, ratio]) => formatRatio(ratio),
    set: (state, ratio) => state.setCompressionRatio(ratio),
    readouts: {
      clearance: (_, state) => formatMillimetres(clearanceHeight(currentSpec(state))),
      'compression-pressure': (_, state) => formatPressure(peakMotoredPressure(currentSpec(state))),
    },
    after: ([type]) => markActiveBand(bands, type),
  });
}
