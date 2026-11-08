import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { createLiveReader } from '../state';
import type { PianoStore } from '../state';
import { COMPARE_READOUTS } from './compareReadouts';
import { dampersReadouts } from './dampersReadouts';
import { KEY_READOUTS } from './keyReadouts';
import { LET_GO_READOUTS } from './letGoReadouts';
import { LEVER_READOUTS } from './leverReadouts';
import { ROOM_READOUTS } from './roomReadouts';

export { CHAPTER_ACTIONS } from './actions';
export { PIANO_CHOICES, VIEW_TOGGLES } from './dock';
export { PIANO_READOUTS } from './readouts';

export function mountPianoUi(root: Document, store: PianoStore): Disposer {
  const read = createLiveReader();
  return mountLiveReadouts(root, store, {
    ...KEY_READOUTS,
    ...LEVER_READOUTS,
    ...LET_GO_READOUTS,
    ...dampersReadouts(read),
    ...ROOM_READOUTS,
    ...COMPARE_READOUTS,
  });
}
