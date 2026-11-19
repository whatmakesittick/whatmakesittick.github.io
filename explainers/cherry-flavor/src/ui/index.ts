import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { FlavorStore } from '../state';
import { mountCherry } from './mountCherry';
import { mountDesk } from './mountDesk';
import { mountIceCream } from './mountIceCream';
import { mountReceptors } from './mountReceptors';
import { mountRoutes } from './mountRoutes';
import { mountTongue } from './mountTongue';

export { CHAPTER_ACTIONS } from './actions';
export { SCALE_CHOICES, VIEW_TOGGLES } from './dock';
export { FLAVOR_READOUTS } from './readouts';

export function mountFlavorUi(root: Document, store: FlavorStore): Disposer {
  return disposeAll([
    mountTongue(root, store),
    mountRoutes(root, store),
    mountReceptors(root, store),
    mountCherry(root, store),
    mountDesk(root, store),
    mountIceCream(root, store),
  ]);
}
