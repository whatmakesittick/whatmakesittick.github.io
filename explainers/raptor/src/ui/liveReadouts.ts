import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import type { RaptorState, RaptorStore } from '../state';
import { readoutElement } from './readoutElement';

export type ReadoutText = (state: RaptorState) => string;

export function mountLiveReadouts(
  root: ParentNode,
  store: RaptorStore,
  readouts: Readonly<Record<string, ReadoutText>>,
): Disposer {
  return disposeAll(
    Object.entries(readouts).map(([id, text]) => {
      const element = readoutElement(root, id);
      return watchLocalized(store, text, (value) => setText(element, value));
    }),
  );
}
