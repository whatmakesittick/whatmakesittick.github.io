import type { ExplainerStore, Playback } from '../explainer';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { requireElement, setText } from './dom';
import { watchLocalized } from './subscribe';

export type ReadoutText<S> = (state: S) => string;

export function mountLiveReadouts<S extends Playback>(
  root: ParentNode,
  store: ExplainerStore<S>,
  readouts: Readonly<Record<string, ReadoutText<NoInfer<S>>>>,
): Disposer {
  return disposeAll(
    Object.entries(readouts).map(([id, text]) => {
      const element = requireElement(root, `[data-readout="${id}"]`);
      return watchLocalized(store, text, (value) => setText(element, value));
    }),
  );
}
