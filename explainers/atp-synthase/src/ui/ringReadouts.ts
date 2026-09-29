import type { Disposer } from '@core/ui/disposers';
import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { ringFacts } from '../model';
import type { AtpSynthaseStore } from '../state';
import { formatCount, formatDecimal, formatPerAtp } from './format';

export function mountRingReadouts(root: Document, store: AtpSynthaseStore): Disposer {
  const blades = requireElement(root, '[data-readout="ring-blades"]');
  const perAtp = requireElement(root, '[data-readout="ring-perAtp"]');
  const perHundred = requireElement(root, '[data-readout="ring-per100"]');
  return watchLocalized(
    store,
    (state) => state.ring,
    (ring) => {
      const facts = ringFacts(ring);
      setText(blades, formatCount(facts.blades));
      setText(perAtp, formatPerAtp(facts.protonsPerAtp));
      setText(perHundred, formatDecimal(facts.atpPerHundredProtons));
    },
  );
}
