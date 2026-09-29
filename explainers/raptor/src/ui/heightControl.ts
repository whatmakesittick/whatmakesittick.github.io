import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { HEIGHT_RANGE, engineOf, performanceOf } from '../state';
import type { Performance, RaptorStore } from '../state';
import { formatBar, formatKm, formatPlume, formatSeconds, formatTonnes, unlessOff } from './format';

type SelectedPhase = readonly [phase: number];

function performanceAt([phase]: SelectedPhase): Readonly<Performance> {
  return performanceOf({ phase });
}

function altitudeAt([phase]: SelectedPhase): number {
  return engineOf({ phase }).altitudeKm;
}

export function mountHeightControl(root: Document, store: RaptorStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'height',
    range: HEIGHT_RANGE,
    select: (state): SelectedPhase => [state.phase],
    value: altitudeAt,
    format: (selected) => formatKm(altitudeAt(selected)),
    set: (state, km) => state.seekAltitude(km),
    readouts: {
      'height-air': (selected) => formatBar(performanceAt(selected).airPressureBar),
      'height-exit': (selected) => {
        const { firing, exitPressureBar } = performanceAt(selected);
        return unlessOff(firing, () => formatBar(exitPressureBar));
      },
      'height-plume': (selected) => formatPlume(performanceAt(selected).plume),
      'height-thrust': (selected) => {
        const { firing, thrustTf } = performanceAt(selected);
        return unlessOff(firing, () => formatTonnes(thrustTf));
      },
      'height-efficiency': (selected) => {
        const { steady, specificImpulse } = performanceAt(selected);
        return unlessOff(steady, () => formatSeconds(specificImpulse));
      },
    },
  });
}
