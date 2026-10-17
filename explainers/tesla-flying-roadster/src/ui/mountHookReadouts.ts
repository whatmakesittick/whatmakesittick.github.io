import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { DECK_HEIGHT, RAMP, bottomLoadG, dropSeconds, topLoadG, topSpeed } from '../model';
import { CALCULATOR_RANGES } from '../state';
import type { ThrusterCarStore } from '../state';
import { HUNDREDTHS, TENTHS, formatGees, formatSeconds, formatSpeedMs } from './format';

const ENTRY_SPEED_CONTROL = 'entrySpeed';

type SelectedEntry = readonly [entrySpeed: number];

export function mountHookReadouts(root: Document, store: ThrusterCarStore): Disposer {
  return mountRangeWidget(root, store, {
    control: ENTRY_SPEED_CONTROL,
    range: CALCULATOR_RANGES.entrySpeed,
    select: (state): SelectedEntry => [state.entrySpeed],
    value: ([speed]) => speed,
    format: ([speed]) => formatSpeedMs(speed, TENTHS),
    set: (state, speed) => state.setEntrySpeed(speed),
    readouts: {
      loopTopSpeed: ([speed]) => formatSpeedMs(topSpeed(speed, RAMP.radius), TENTHS),
      loopBottomG: ([speed]) => formatGees(bottomLoadG(speed, RAMP.radius)),
      loopTopG: ([speed]) => formatGees(topLoadG(speed, RAMP.radius)),
      dropTime: () => formatSeconds(dropSeconds(DECK_HEIGHT), HUNDREDTHS),
    },
  });
}
