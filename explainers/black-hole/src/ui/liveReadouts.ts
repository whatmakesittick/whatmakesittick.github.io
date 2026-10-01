import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import type { BlackHoleState, BlackHoleStore } from '../state';

export type ReadoutText = (state: BlackHoleState) => string;

export function mountLiveReadouts(
  root: ParentNode,
  store: BlackHoleStore,
  readouts: Readonly<Record<string, ReadoutText>>,
): Disposer {
  return disposeAll(
    Object.entries(readouts).map(([id, text]) => {
      const element = requireElement(root, `[data-readout="${id}"]`);
      return watchLocalized(store, text, (value) => setText(element, value));
    }),
  );
}
