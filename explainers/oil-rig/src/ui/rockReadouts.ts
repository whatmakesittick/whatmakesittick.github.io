import { requireElement, setText } from '@core/ui/dom';
import { watch, watchLocalized } from '@core/ui/subscribe';
import { porosityAt, temperatureAtC } from '../model';
import type { OilRigStore } from '../state';
import { NO_VALUE, formatCelsius, formatPercent } from './format';
import { PoresView, poreSceneAt } from './poresView';

export function mountRockReadouts(root: Document, store: OilRigStore): void {
  const pores = new PoresView(requireElement<HTMLCanvasElement>(root, '[data-view="pores"]'));
  const temperature = requireElement(root, '[data-readout="rock-temperature"]');
  const porosity = requireElement(root, '[data-readout="rock-porosity"]');
  watch(
    store,
    (state) => poreSceneAt(state.phase),
    (scene) => pores.draw(scene),
  );
  watchLocalized(
    store,
    (state) => Math.round(temperatureAtC(state.phase)),
    (celsius) => setText(temperature, formatCelsius(celsius)),
  );
  watchLocalized(
    store,
    (state) => porosityAt(state.phase),
    (share) => setText(porosity, share === null ? NO_VALUE : formatPercent(share)),
  );
}
