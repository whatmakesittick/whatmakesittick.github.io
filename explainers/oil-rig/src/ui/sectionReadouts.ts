import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { drillStringWeightT, holeDiameterMm, whenInRock } from '../model';
import { effectiveMudWeight } from '../state';
import type { OilRigStore } from '../state';
import { formatMetres, formatMillimetres, formatOptional, formatTonnes } from './format';

export function mountSectionReadouts(root: Document, store: OilRigStore): void {
  const hole = requireElement(root, '[data-readout="hole-size"]');
  const string = requireElement(root, '[data-readout="string-length"]');
  const weight = requireElement(root, '[data-readout="string-weight"]');
  watchLocalized(
    store,
    (state) => whenInRock(state.phase, holeDiameterMm),
    (millimetres) => setText(hole, formatOptional(millimetres, formatMillimetres)),
  );
  watchLocalized(
    store,
    (state) => Math.floor(state.phase),
    (metres) => setText(string, formatMetres(metres)),
  );
  watchLocalized(
    store,
    (state) => Math.round(drillStringWeightT(state.phase, effectiveMudWeight(state))),
    (tonnes) => setText(weight, formatTonnes(tonnes)),
  );
}
