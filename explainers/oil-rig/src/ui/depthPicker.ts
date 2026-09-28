import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { rigsFor, seaPressureBar } from '../model';
import { WATER_DEPTH_RANGE } from '../state';
import type { OilRigStore } from '../state';
import { formatBar, formatMetres, formatRigs } from './format';
import { RigPicker } from './rigPicker';

export function mountDepthPicker(root: Document, store: OilRigStore): void {
  const picker = new RigPicker(requireElement<HTMLCanvasElement>(root, '[data-view="rigs"]'));
  mountRangeWidget(root, store, {
    control: 'water-depth',
    range: WATER_DEPTH_RANGE,
    select: (state) => [state.pickerDepth] as const,
    value: ([depth]) => depth,
    format: ([depth]) => formatMetres(depth),
    set: (state, depth) => state.setPickerDepth(depth),
    readouts: {
      'water-pressure': ([depth]) => formatBar(seaPressureBar(depth)),
      'water-rigs': ([depth]) => formatRigs(rigsFor(depth)),
    },
    after: ([depth]) => picker.draw(depth),
  });
}
