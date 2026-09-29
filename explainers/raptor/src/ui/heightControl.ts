import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { HEIGHT_RANGE, engineOf, performanceOf } from '../state';
import type { RaptorStore } from '../state';
import { formatBar, formatKm, formatOff, formatPlume, formatSeconds, formatTonnes } from './format';

type Moment = readonly [phase: number];

function performanceAt([phase]: Moment) {
  return performanceOf({ phase });
}

export function mountHeightControl(root: Document, store: RaptorStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'height',
    range: HEIGHT_RANGE,
    select: (state) => [state.phase] as const,
    value: ([phase]) => engineOf({ phase }).altitudeKm,
    format: ([phase]) => formatKm(engineOf({ phase }).altitudeKm),
    set: (state, km) => state.seekAltitude(km),
    readouts: {
      'height-air': (moment) => formatBar(performanceAt(moment).airPressureBar),
      'height-exit': (moment) => formatBar(performanceAt(moment).exitPressureBar),
      'height-plume': (moment) => formatPlume(performanceAt(moment).plume),
      'height-thrust': (moment) => formatTonnes(performanceAt(moment).thrustTf),
      'height-efficiency': (moment) => {
        const { firing, specificImpulse } = performanceAt(moment);
        return firing ? formatSeconds(specificImpulse) : formatOff();
      },
    },
  });
}
