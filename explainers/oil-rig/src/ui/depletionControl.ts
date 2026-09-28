import { mountRangeWidget } from '@core/ui/rangeWidget';
import { OIL_COLUMN_BAR, flowState, reservoirPressureBar, wellheadPressureBar } from '../model';
import { PRODUCTION_YEARS_RANGE } from '../state';
import type { OilRigStore } from '../state';
import { formatBar, formatFlowState, formatYear } from './format';

export function mountDepletionControl(root: Document, store: OilRigStore): void {
  mountRangeWidget(root, store, {
    control: 'production-years',
    range: PRODUCTION_YEARS_RANGE,
    select: (state) => [state.productionYears] as const,
    value: ([years]) => years,
    format: ([years]) => formatYear(years),
    set: (state, years) => state.setProductionYears(years),
    readouts: {
      'reservoir-pressure': ([years]) => formatBar(reservoirPressureBar(years)),
      'oil-column': () => formatBar(OIL_COLUMN_BAR),
      'wellhead-pressure': ([years]) => formatBar(wellheadPressureBar(years)),
      'flow-state': ([years]) => formatFlowState(flowState(years)),
    },
    after: ([years], _state, widget) => {
      widget.dataset.flowState = flowState(years);
    },
  });
}
