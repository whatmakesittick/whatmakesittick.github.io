import type { Disposer } from '@core/ui/disposers';
import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { aerobicShare, anaerobicShare, middleOf } from '../model';
import type { AtpSynthaseStore } from '../state';
import { formatPercentRange } from './format';

const AEROBIC_SHARE_PROPERTY = '--aerobic-share';
const PERCENT_SIGN = '%';

export function mountEventReadouts(root: Document, store: AtpSynthaseStore): Disposer {
  const bar = requireElement(root, '[data-view="energy-split"]');
  const aerobic = requireElement(root, '[data-readout="event-aerobic"]');
  const anaerobic = requireElement(root, '[data-readout="event-anaerobic"]');
  return watchLocalized(
    store,
    (state) => state.event,
    (event) => {
      const share = aerobicShare(event);
      bar.style.setProperty(AEROBIC_SHARE_PROPERTY, `${middleOf(share)}${PERCENT_SIGN}`);
      setText(aerobic, formatPercentRange(share));
      setText(anaerobic, formatPercentRange(anaerobicShare(event)));
    },
  );
}
