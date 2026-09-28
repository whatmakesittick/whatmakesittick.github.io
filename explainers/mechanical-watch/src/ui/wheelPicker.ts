import { requireElement, setText } from '@core/ui/dom';
import { watchLocalized } from '@core/ui/subscribe';
import type { WheelId } from '../ids';
import { secondsPerTurn, stepUp, wheelSpec } from '../model';
import type { WatchStore } from '../state';
import type { Disposer } from './disposers';
import { formatStepUp, formatTeeth, formatTurnPeriod } from './format';

function pinionLeaves(wheel: WheelId): number | null {
  const { pinionLeaves } = wheelSpec(wheel);
  return pinionLeaves > 0 ? pinionLeaves : null;
}

function speedUp(wheel: WheelId): number | null {
  return pinionLeaves(wheel) === null ? null : stepUp(wheel);
}

export function mountWheelPicker(root: Document, store: WatchStore): Disposer {
  const teeth = requireElement(root, '[data-readout="wheel-teeth"]');
  const turn = requireElement(root, '[data-readout="wheel-turn"]');
  const ratio = requireElement(root, '[data-readout="wheel-ratio"]');
  return watchLocalized(
    store,
    (state) => state.wheel,
    (wheel) => {
      setText(teeth, formatTeeth(wheelSpec(wheel).teeth, pinionLeaves(wheel)));
      setText(turn, formatTurnPeriod(secondsPerTurn(wheel)));
      setText(ratio, formatStepUp(speedUp(wheel)));
    },
  );
}
