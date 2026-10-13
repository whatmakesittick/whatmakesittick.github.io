import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import type { ChainsawStore } from '../state';
import { formatBrake } from './format';

export function mountKickbackReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountLiveReadouts(root, store, {
    brakeState: (state) => formatBrake(state.brake),
  });
}
