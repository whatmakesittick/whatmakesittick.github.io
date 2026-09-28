import { requireElement } from '@core/ui/dom';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { amplitude, arborTurns, storedEnergyJ, torqueMNm } from '../model';
import { RESERVE_RANGE } from '../state';
import type { WatchStore } from '../state';
import type { Disposer } from './disposers';
import { formatDegrees, formatHours, formatJoules, formatTorque, formatTurns } from './format';

const WIND_CHIP = '.chip[data-action="wind"]';

export function mountReserveControl(root: Document, store: WatchStore): Disposer {
  const windChip = requireElement(root, WIND_CHIP);
  return mountRangeWidget(root, store, {
    control: 'reserve',
    range: RESERVE_RANGE,
    select: (state) => [state.reserve] as const,
    value: ([reserve]) => reserve,
    format: ([reserve]) => formatHours(reserve),
    set: (state, reserve) => state.setReserve(reserve),
    readouts: {
      'reserve-torque': ([reserve]) => formatTorque(torqueMNm(reserve)),
      'reserve-turns': ([reserve]) => formatTurns(arborTurns(reserve)),
      'reserve-amplitude': ([reserve]) => formatDegrees(amplitude(reserve)),
      'reserve-energy': ([reserve]) => formatJoules(storedEnergyJ(reserve)),
    },
    after: ([reserve]) => {
      windChip.setAttribute('aria-disabled', String(reserve >= RESERVE_RANGE.max));
    },
  });
}
