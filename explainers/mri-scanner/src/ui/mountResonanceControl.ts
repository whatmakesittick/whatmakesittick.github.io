import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { TIP_ANGLE_RANGE } from '../state';
import type { MriScannerStore } from '../state';
import { formatAcross, formatAlong, formatDegrees, formatT1, formatT2 } from './format';
import { inChapter } from './actions';

type SelectedTip = readonly [tipAngle: number];

export function mountResonanceControl(root: Document, store: MriScannerStore): Disposer {
  return disposeAll([
    mountRangeWidget(root, store, {
      control: 'tip-angle',
      range: TIP_ANGLE_RANGE,
      select: (state): SelectedTip => [state.tipAngle],
      value: ([tipAngle]) => tipAngle,
      format: ([tipAngle]) => formatDegrees(tipAngle),
      set: inChapter('resonance', (state, degrees: number) => state.setTipAngle(degrees)),
      readouts: {
        across: ([tipAngle]) => formatAcross(tipAngle),
        along: ([tipAngle]) => formatAlong(tipAngle),
      },
    }),
    mountLiveReadouts(root, store, {
      t1: (state) => formatT1(state.field, state.tissue),
      t2: (state) => formatT2(state.field, state.tissue),
    }),
  ]);
}
