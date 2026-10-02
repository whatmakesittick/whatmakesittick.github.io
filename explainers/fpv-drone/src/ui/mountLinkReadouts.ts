import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { packetPeriodMs, rangeFactor, sensitivityDbm } from '../model';
import { sortieAt } from '../state';
import type { FpvStore } from '../state';
import {
  formatDbm,
  formatLatency,
  formatMetres,
  formatMilliseconds,
  formatPicture,
  formatSignal,
  formatTimes,
} from './format';

export function mountLinkReadouts(root: Document, store: FpvStore): Disposer {
  return mountLiveReadouts(root, store, {
    'link-latency': (state) => formatLatency(state.video),
    'link-picture': (state) => formatPicture(state.video),
    'rate-period': (state) => formatMilliseconds(packetPeriodMs(state.packetRate)),
    'rate-sensitivity': (state) => formatDbm(sensitivityDbm(state.packetRate)),
    'rate-reach': (state) => formatTimes(rangeFactor(state.packetRate)),
    'link-distance': (state) => formatMetres(sortieAt(state).link.distance),
    'link-signal': (state) => formatSignal(sortieAt(state).link.signal),
  });
}
