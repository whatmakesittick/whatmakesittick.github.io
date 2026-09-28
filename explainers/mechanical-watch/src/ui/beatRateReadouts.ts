import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { beatRateFacts } from '../model';
import type { WatchStore } from '../state';
import type { Disposer } from './disposers';
import { formatCount, formatRpm } from './format';

export function mountBeatRateReadouts(root: Document, store: WatchStore): Disposer {
  const perSecond = requireElement(root, '[data-readout="beat-perSecond"]');
  const perDay = requireElement(root, '[data-readout="beat-perDay"]');
  const steps = requireElement(root, '[data-readout="beat-steps"]');
  const escape = requireElement(root, '[data-readout="beat-escape"]');
  return watchLocalized(
    store,
    (state) => state.beatRate,
    (beatRate) => {
      const facts = beatRateFacts(beatRate);
      setText(perSecond, formatCount(facts.beatsPerSecond));
      setText(perDay, formatCount(facts.beatsPerDay));
      setText(steps, formatCount(facts.secondStepsPerSecond));
      setText(escape, formatRpm(facts.escapeWheelRpm));
    },
  );
}
