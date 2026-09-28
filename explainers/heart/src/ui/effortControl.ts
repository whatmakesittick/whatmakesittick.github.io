import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { cardiacOutput, diastoleLength, heartRate, roundTripSeconds, strokeVolume } from '../model';
import { EFFORT_RANGE } from '../state';
import type { HeartStore } from '../state';
import { BeatSplitView } from './beatSplitView';
import {
  formatEffort,
  formatLitres,
  formatMl,
  formatMs,
  formatPerMinute,
  formatSeconds,
} from './format';

export function mountEffortControl(root: Document, store: HeartStore): Disposer {
  const view = new BeatSplitView(
    requireElement<HTMLCanvasElement>(root, '[data-view="beat-split"]'),
  );
  const unmount = mountRangeWidget(root, store, {
    control: 'effort',
    range: EFFORT_RANGE,
    select: (state) => [state.effort, state.fitness] as const,
    value: ([effort]) => effort,
    format: ([effort]) => formatEffort(effort),
    set: (state, effort) => state.setEffort(effort),
    readouts: {
      'effort-rate': ([effort, fitness]) => formatPerMinute(heartRate(effort, fitness)),
      'effort-stroke': ([effort, fitness]) => formatMl(strokeVolume(effort, fitness)),
      'effort-output': ([effort, fitness]) => formatLitres(cardiacOutput(effort, fitness)),
      'effort-filling': ([effort, fitness]) => formatMs(diastoleLength(heartRate(effort, fitness))),
      'effort-trip': ([effort, fitness]) =>
        formatSeconds(roundTripSeconds(cardiacOutput(effort, fitness))),
    },
    after: ([effort, fitness]) => view.draw(fitness, effort),
  });
  return () => {
    unmount();
    view.dispose();
  };
}
