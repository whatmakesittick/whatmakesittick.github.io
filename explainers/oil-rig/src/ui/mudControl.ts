import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import {
  fracturePressureBar,
  mudPressureBar,
  mudState,
  porePressureBar,
  riserLanded,
  whenInRock,
} from '../model';
import { MUD_WEIGHT_RANGE, effectiveMudWeight } from '../state';
import type { OilRigStore } from '../state';
import { formatBar, formatDensity, formatMudState, formatOptional } from './format';
import { MudWindowGraph } from './mudWindowGraph';

const PLANNED_ATTRIBUTE = 'data-planned';

function rockPressure(depth: number, pressure: (depth: number) => number): string {
  return formatOptional(whenInRock(depth, pressure), formatBar);
}

export function mountMudControl(root: Document, store: OilRigStore): void {
  const graph = new MudWindowGraph(
    requireElement<HTMLCanvasElement>(root, '[data-view="mud-window"]'),
  );
  mountRangeWidget(root, store, {
    control: 'mud-weight',
    range: MUD_WEIGHT_RANGE,
    select: (state) =>
      [effectiveMudWeight(state), Math.round(state.phase), state.mudWeight === null] as const,
    value: ([mudWeight]) => mudWeight,
    format: ([mudWeight]) => formatDensity(mudWeight),
    set: (state, mudWeight) => state.setMudWeight(mudWeight),
    readouts: {
      'mud-pressure': ([mudWeight, depth]) => formatBar(mudPressureBar(depth, mudWeight)),
      'pore-pressure': ([, depth]) => rockPressure(depth, porePressureBar),
      'fracture-pressure': ([, depth]) => rockPressure(depth, fracturePressureBar),
      'mud-state': ([mudWeight, depth]) => formatMudState(mudState(depth, mudWeight)),
    },
    after: ([mudWeight, depth, planned], _state, widget) => {
      const state = mudState(depth, mudWeight);
      widget.dataset.mudState = state;
      widget.toggleAttribute(PLANNED_ATTRIBUTE, planned);
      graph.draw({ mudWeight, bitDepth: depth, riser: riserLanded(depth), state });
    },
  });
}
