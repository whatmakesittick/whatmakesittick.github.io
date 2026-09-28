import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { belowGapShare, pairsPerSecondPerHalfCell, thermalisedShare } from '../model';
import { irradianceOf } from '../state';
import type { SolarPanelState, SolarPanelStore } from '../state';
import { formatPercent, formatScientific } from './format';

const SHOWN_DIGITS = 2;

function pairsOf(state: SolarPanelState): number {
  return Number(pairsPerSecondPerHalfCell(irradianceOf(state)).toPrecision(SHOWN_DIGITS));
}

export function mountJunctionReadouts(root: Document, store: SolarPanelStore): Disposer {
  const pairs = requireElement(root, '[data-readout="junction-pairs"]');
  const tooWeak = requireElement(root, '[data-readout="junction-tooWeak"]');
  const heat = requireElement(root, '[data-readout="junction-heat"]');
  return disposeAll([
    watchLocalized(store, pairsOf, (count) => setText(pairs, formatScientific(count))),
    watchLocalized(store, belowGapShare, (share) => setText(tooWeak, formatPercent(share))),
    watchLocalized(store, thermalisedShare, (share) => setText(heat, formatPercent(share))),
  ]);
}
