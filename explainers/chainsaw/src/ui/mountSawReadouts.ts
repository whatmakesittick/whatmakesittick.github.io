import type { Disposer } from '@core/ui/disposers';
import type { ChainsawStore } from '../state';
import { mountThrottle } from './mountThrottle';

const SAW_THROTTLE_INPUT = 'saw-throttle';

export function mountSawReadouts(root: Document, store: ChainsawStore): Disposer {
  return mountThrottle(root, store, SAW_THROTTLE_INPUT, { rpm: 'sawRpm', chain: 'sawChain' });
}
