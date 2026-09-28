import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { aorticFlow } from '../model';
import { pressuresOf, timeOf } from '../state';
import type { HeartState, HeartStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { formatMlPerSecond, formatMmHg } from './format';
import { readoutElement } from './readoutElement';
import { WiggersView } from './wiggersView';

type Rounded = (state: HeartState) => number;

const READOUTS: Readonly<Record<string, Rounded>> = {
  'cycle-ventricle': (state) => Math.round(pressuresOf(state).leftVentricle),
  'cycle-aorta': (state) => Math.round(pressuresOf(state).aorta),
  'cycle-atrium': (state) => Math.round(pressuresOf(state).leftAtrium),
};

function flowOf(state: HeartState): number {
  return Math.round(aorticFlow(timeOf(state)));
}

export function mountCycleReadouts(root: Document, store: HeartStore): Disposer {
  const view = new WiggersView(requireElement<HTMLCanvasElement>(root, '[data-view="wiggers"]'));
  const flow = readoutElement(root, 'cycle-flow');
  const pressures = Object.entries(READOUTS).map(([id, select]) => {
    const element = readoutElement(root, id);
    return watchLocalized(store, select, (mmHg) => setText(element, formatMmHg(mmHg)));
  });
  const unmount = disposeAll([
    ...pressures,
    watchLocalized(store, flowOf, (millilitresPerSecond) =>
      setText(flow, formatMlPerSecond(millilitresPerSecond)),
    ),
    watchLocalized(store, timeOf, (time) => view.draw(time)),
  ]);
  return () => {
    unmount();
    view.dispose();
  };
}
