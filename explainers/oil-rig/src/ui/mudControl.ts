import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import {
  fracturePressureBar,
  mudColumnBar,
  porePressureBar,
  riserLanded,
  whenInRock,
} from '../model';
import { MUD_WEIGHT_RANGE, effectiveMudWeight, mudStateOf } from '../state';
import type { OilRigStore } from '../state';
import { formatBar, formatDensity, formatMudState, formatOptional } from './format';
import { MudWindowGraph, depthBucket } from './mudWindowGraph';

const PLAN_CHIP = '.chip[data-action="mudPlan"]';

function rockPressure(depth: number, pressure: (depth: number) => number): string {
  return formatOptional(whenInRock(depth, pressure), formatBar);
}

export function mountMudControl(root: Document, store: OilRigStore): Disposer {
  const graph = new MudWindowGraph(
    requireElement<HTMLCanvasElement>(root, '[data-view="mud-window"]'),
  );
  const planChip = requireElement(root, PLAN_CHIP);
  const unmount = mountRangeWidget(root, store, {
    control: 'mud-weight',
    range: MUD_WEIGHT_RANGE,
    select: (state) =>
      [
        effectiveMudWeight(state),
        depthBucket(state.phase),
        mudStateOf(state),
        riserLanded(state.phase),
        state.mudWeight === null,
      ] as const,
    value: ([mudWeight]) => mudWeight,
    format: ([mudWeight]) => formatDensity(mudWeight),
    set: (state, mudWeight) => state.setMudWeight(mudWeight),
    readouts: {
      'mud-pressure': ([mudWeight, depth, , riser]) =>
        formatBar(mudColumnBar(depth, mudWeight, riser)),
      'pore-pressure': ([, depth]) => rockPressure(depth, porePressureBar),
      'fracture-pressure': ([, depth]) => rockPressure(depth, fracturePressureBar),
      'mud-state': ([, , state]) => formatMudState(state),
    },
    after: ([mudWeight, depth, state, riser, planned], _state, widget) => {
      widget.dataset.mudState = state;
      planChip.setAttribute('aria-disabled', String(planned));
      graph.draw({ mudWeight, bitDepth: depth, riser, state });
    },
  });
  return () => {
    unmount();
    graph.dispose();
  };
}
