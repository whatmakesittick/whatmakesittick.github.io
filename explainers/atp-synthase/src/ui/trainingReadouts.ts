import type { Disposer } from '@core/ui/disposers';
import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { trainingLevel } from '../model';
import type { AtpSynthaseStore } from '../state';
import { formatCount, formatPercent, formatTimes } from './format';

export function mountTrainingReadouts(root: Document, store: AtpSynthaseStore): Disposer {
  const share = requireElement(root, '[data-readout="training-share"]');
  const membrane = requireElement(root, '[data-readout="training-membrane"]');
  const motors = requireElement(root, '[data-readout="training-motors"]');
  return watchLocalized(
    store,
    (state) => state.training,
    (training) => {
      const level = trainingLevel(training);
      setText(share, formatPercent(level.mitochondriaPercent));
      setText(membrane, formatTimes(level.membraneFactor));
      setText(motors, formatCount(level.motors));
    },
  );
}
