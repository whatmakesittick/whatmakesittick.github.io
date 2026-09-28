import type { WatchStore } from '../state';
import { mountBeatRateReadouts } from './beatRateReadouts';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { mountEscapementReadouts } from './escapementReadouts';
import { mountRegulatorControl } from './regulatorControl';
import { mountReserveControl } from './reserveControl';
import { mountWheelPicker } from './wheelPicker';

export { CHAPTER_ACTIONS } from './actions';
export { VIEW_TOGGLES, WATCH_CHOICES } from './dock';
export { WATCH_READOUTS } from './readouts';

export function mountWatchUi(root: Document, store: WatchStore): Disposer {
  return disposeAll([
    mountReserveControl(root, store),
    mountWheelPicker(root, store),
    mountEscapementReadouts(root, store),
    mountRegulatorControl(root, store),
    mountBeatRateReadouts(root, store),
  ]);
}
