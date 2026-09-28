import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import type { ShadeAnalysis } from '../model';
import { LAYOUTS, cellCount, diodeCount, shadedAreaShare, shadedCellCount } from '../model';
import { SHADE_RANGE, powerOf, shadeAnalysisOf } from '../state';
import type { SolarPanelStore } from '../state';
import type { Disposer } from './disposers';
import { formatPercent, formatShadedCells, formatWatts, formatWorkingDiodes } from './format';
import { IvCurveView } from './ivCurveView';

function shadeLoss(analysis: ShadeAnalysis): number {
  const { maximum, clearMaximum } = analysis;
  return clearMaximum.power > 0 ? 1 - maximum.power / clearMaximum.power : 0;
}

export function mountShadeControl(root: Document, store: SolarPanelStore): Disposer {
  const view = new IvCurveView(requireElement<HTMLCanvasElement>(root, '[data-view="iv-curve"]'));
  const unmount = mountRangeWidget(root, store, {
    control: 'shade',
    range: SHADE_RANGE,
    select: (state) =>
      [state.shade, state.layout, Math.round(powerOf(state)), shadeAnalysisOf(state)] as const,
    value: ([shade]) => shade,
    format: ([shade, layout]) => formatPercent(shadedAreaShare(LAYOUTS[layout], shade)),
    set: (state, shade) => state.setShade(shade),
    readouts: {
      'shade-cells': ([shade, layout]) =>
        formatShadedCells(shadedCellCount(LAYOUTS[layout], shade), cellCount(LAYOUTS[layout])),
      'shade-diodes': ([, layout, , analysis]) =>
        formatWorkingDiodes(
          analysis.activeDiodes.filter(Boolean).length,
          diodeCount(LAYOUTS[layout]),
        ),
      'shade-power': ([, , power]) => formatWatts(power),
      'shade-loss': ([, , , analysis]) => formatPercent(shadeLoss(analysis)),
    },
    after: ([, , , analysis]) => view.draw(analysis),
  });
  return () => {
    unmount();
    view.dispose();
  };
}
