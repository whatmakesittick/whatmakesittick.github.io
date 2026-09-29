import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { requireElement } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import { ENGINES } from '../model/engines';
import type { EngineSpec } from '../model/engines';
import type { RaptorState, RaptorStore } from '../state';
import { CycleView } from './cycleView';
import {
  formatAboutBar,
  formatAboutTonnes,
  formatCycle,
  formatDumps,
  formatExactBar,
  formatPropellantPair,
  formatTonnes,
} from './format';
import { mountLiveReadouts } from './liveReadouts';

function chosen(state: RaptorState): EngineSpec {
  return ENGINES[state.engine];
}

function thrust({ thrustTf, thrustIsApproximate }: EngineSpec): string {
  return thrustIsApproximate ? formatAboutTonnes(thrustTf) : formatTonnes(thrustTf);
}

function chamberPressure({ chamberBar, chamberBarIsApproximate }: EngineSpec): string {
  return chamberBarIsApproximate ? formatAboutBar(chamberBar) : formatExactBar(chamberBar);
}

export function mountEngineReadouts(root: Document, store: RaptorStore): Disposer {
  const view = new CycleView(requireElement<HTMLCanvasElement>(root, '[data-view="cycle"]'));
  const unmount = disposeAll([
    mountLiveReadouts(root, store, {
      'engine-cycle': (state) => formatCycle(chosen(state).cycle),
      'engine-propellants': (state) => formatPropellantPair(chosen(state).propellants),
      'engine-pressure': (state) => chamberPressure(chosen(state)),
      'engine-thrust': (state) => thrust(chosen(state)),
      'engine-dumps': (state) => formatDumps(chosen(state).dumps),
    }),
    watchLocalized(
      store,
      (state) => state.engine,
      (engine) => view.draw(engine),
    ),
  ]);
  return () => {
    unmount();
    view.dispose();
  };
}
