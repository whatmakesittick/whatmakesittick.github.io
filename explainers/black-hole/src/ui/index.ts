import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import type { BlackHoleStore } from '../state';
import { mountFrozenReadouts } from './mountFrozenReadouts';
import { mountInsideReadouts } from './mountInsideReadouts';
import { mountOthersReadouts } from './mountOthersReadouts';
import { mountOverviewReadouts } from './mountOverviewReadouts';
import { mountRadiusControl } from './mountRadiusControl';

export { CHAPTER_ACTIONS } from './actions';
export { BLACK_HOLE_CHOICES, VIEW_TOGGLES } from './dock';
export { BLACK_HOLE_READOUTS } from './readouts';

export function mountBlackHoleUi(root: Document, store: BlackHoleStore): Disposer {
  return disposeAll([
    mountOverviewReadouts(root, store),
    mountRadiusControl(root, store),
    mountFrozenReadouts(root, store),
    mountInsideReadouts(root, store),
    mountOthersReadouts(root, store),
  ]);
}
