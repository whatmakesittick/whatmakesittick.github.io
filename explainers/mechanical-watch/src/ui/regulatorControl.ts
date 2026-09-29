import type { Disposer } from '@core/ui/disposers';
import { mountRangeWidget } from '@core/ui/rangeWidget';
import { activeLengthMm, balanceEnergyMicroJ, dailyRate, isWithinCosc, periodMs } from '../model';
import { REGULATOR_RANGE, amplitudeOf } from '../state';
import type { WatchStore } from '../state';
import {
  formatMicroJoules,
  formatMilliseconds,
  formatMillimetres,
  formatRate,
  formatRegulatorIndex,
} from './format';

const PERIOD_DIGITS = 2;

export function mountRegulatorControl(root: Document, store: WatchStore): Disposer {
  return mountRangeWidget(root, store, {
    control: 'regulator',
    range: REGULATOR_RANGE,
    select: (state) => [state.regulator, amplitudeOf(state)] as const,
    value: ([index]) => index,
    format: ([index]) => formatRegulatorIndex(index),
    set: (state, index) => state.setRegulator(index),
    readouts: {
      'regulator-rate': ([index]) => formatRate(dailyRate(index)),
      'regulator-period': ([index]) => formatMilliseconds(periodMs(index), PERIOD_DIGITS),
      'regulator-length': ([index]) => formatMillimetres(activeLengthMm(index)),
      'regulator-energy': ([, amplitude]) => formatMicroJoules(balanceEnergyMicroJ(amplitude)),
    },
    after: ([index], _state, widget) => {
      widget.dataset.rateBand = isWithinCosc(dailyRate(index)) ? 'good' : 'warn';
    },
  });
}
