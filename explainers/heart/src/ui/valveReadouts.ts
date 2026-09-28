import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { valveFacts, valveMoment } from '../model';
import type { ValveMoment } from '../model';
import { timeOf } from '../state';
import type { HeartState, HeartStore } from '../state';
import { formatBetween, formatCount, formatMs, formatValveMoment } from './format';
import { readoutElement } from './readoutElement';

function momentOf(state: HeartState): ValveMoment {
  return valveMoment(state.valve, timeOf(state));
}

export function mountValveReadouts(root: Document, store: HeartStore): Disposer {
  const between = readoutElement(root, 'valve-between');
  const leaflets = readoutElement(root, 'valve-leaflets');
  const opens = readoutElement(root, 'valve-opens');
  const closes = readoutElement(root, 'valve-closes');
  const now = readoutElement(root, 'valve-now');
  return disposeAll([
    watchLocalized(
      store,
      (state) => state.valve,
      (valve) => {
        const facts = valveFacts(valve);
        setText(between, formatBetween(valve));
        setText(leaflets, formatCount(facts.leaflets));
        setText(opens, formatMs(facts.opensAtMs));
        setText(closes, formatMs(facts.closesAtMs));
      },
    ),
    watchLocalized(store, momentOf, (moment) => setText(now, formatValveMoment(moment))),
  ]);
}
