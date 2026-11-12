import type { Disposer } from '@core/ui/disposers';
import { disposeAll } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { EuvStore } from '../state';
import { COMPARE_READOUTS } from './compareReadouts';
import { LIGHT_READOUTS } from './lightReadouts';
import { MACHINE_READOUTS } from './machineReadouts';
import { MIRRORS_READOUTS } from './mirrorsReadouts';
import { MASK_READOUTS } from './maskReadouts';
import { mountBounceControl } from './mountBounceControl';
import { SCAN_READOUTS } from './scanReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { EUV_CHOICES, VIEW_TOGGLES } from './dock';
export { EUV_READOUTS } from './readouts';

export function mountEuvUi(root: Document, store: EuvStore): Disposer {
  return disposeAll([
    mountLiveReadouts(root, store, {
      ...MACHINE_READOUTS,
      ...LIGHT_READOUTS,
      ...MIRRORS_READOUTS,
      ...MASK_READOUTS,
      ...SCAN_READOUTS,
      ...COMPARE_READOUTS,
    }),
    mountBounceControl(root, store),
  ]);
}
