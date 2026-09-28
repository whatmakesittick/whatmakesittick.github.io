import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { conductionSite, ecgMillivolts } from '../model';
import { timeOf } from '../state';
import type { HeartState, HeartStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { EcgView } from './ecgView';
import { formatMillivolts, formatMs, formatSignal, roundMillivolts } from './format';
import { readoutElement } from './readoutElement';

function millivoltsOf(state: HeartState): number {
  return roundMillivolts(ecgMillivolts(timeOf(state)));
}

export function mountConductionReadouts(root: Document, store: HeartStore): Disposer {
  const view = new EcgView(requireElement<HTMLCanvasElement>(root, '[data-view="ecg"]'));
  const where = readoutElement(root, 'conduction-where');
  const since = readoutElement(root, 'conduction-since');
  const trace = readoutElement(root, 'conduction-trace');
  const unmount = disposeAll([
    watchLocalized(
      store,
      (state) => conductionSite(timeOf(state)),
      (site) => setText(where, formatSignal(site)),
    ),
    watchLocalized(
      store,
      (state) => Math.floor(timeOf(state)),
      (time) => setText(since, formatMs(time)),
    ),
    watchLocalized(store, millivoltsOf, (millivolts) =>
      setText(trace, formatMillivolts(millivolts)),
    ),
    watchLocalized(store, timeOf, (time) => view.draw(time)),
  ]);
  return () => {
    unmount();
    view.dispose();
  };
}
