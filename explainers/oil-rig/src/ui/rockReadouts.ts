import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { porosityAt, rockSampleDepth, temperatureAtC, whenInRock } from '../model';
import type { OilRigStore } from '../state';
import { disposeAll } from './disposers';
import type { Disposer } from './disposers';
import { formatCelsius, formatOptional, formatPercent } from './format';
import { PoresView, poreSceneAt } from './poresView';

function roundedTemperatureC(depth: number): number {
  return Math.round(temperatureAtC(depth));
}

export function mountRockReadouts(root: Document, store: OilRigStore): Disposer {
  const pores = new PoresView(requireElement<HTMLCanvasElement>(root, '[data-view="pores"]'));
  const temperature = requireElement(root, '[data-readout="rock-temperature"]');
  const porosity = requireElement(root, '[data-readout="rock-porosity"]');
  return disposeAll([
    watchLocalized(
      store,
      (state) => poreSceneAt(rockSampleDepth(state.phase)),
      (scene) => pores.draw(scene),
    ),
    watchLocalized(
      store,
      (state) => whenInRock(rockSampleDepth(state.phase), roundedTemperatureC),
      (celsius) => setText(temperature, formatOptional(celsius, formatCelsius)),
    ),
    watchLocalized(
      store,
      (state) => porosityAt(rockSampleDepth(state.phase)),
      (share) => setText(porosity, formatOptional(share, formatPercent)),
    ),
    () => pores.dispose(),
  ]);
}
