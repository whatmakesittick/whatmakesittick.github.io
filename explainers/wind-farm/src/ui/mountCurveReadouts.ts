import { disposeAll } from '@core/ui/disposers';
import type { Disposer } from '@core/ui/disposers';
import { mountLiveReadouts } from '@core/ui/liveReadouts';
import { betzShare, powerCoefficient, windPowerKw } from '../model';
import { liveReading } from '../state';
import type { LiveReading, WindFarmStore } from '../state';
import { formatDegrees, formatOperatingState, formatPercent, formatTurbineMw } from './format';
import { mountPowerCurve } from './powerCurveView';
import { mountWindOverride } from './mountWindOverride';

const CURVE_WIND_INPUT = 'curve-wind';

function whenProducing(share: (wind: number) => number) {
  return ({ wind, operating }: LiveReading): number => (operating.producing ? share(wind) : 0);
}

const coefficientOf = whenProducing(powerCoefficient);
const betzShareOf = whenProducing(betzShare);

export function mountCurveReadouts(root: Document, store: WindFarmStore): Disposer {
  return disposeAll([
    mountWindOverride(root, store, CURVE_WIND_INPUT),
    mountLiveReadouts(root, store, {
      operatingState: (state) => formatOperatingState(liveReading(state).operating.state),
      curvePower: (state) => formatTurbineMw(liveReading(state).heroKw),
      windPower: (state) => formatTurbineMw(windPowerKw(liveReading(state).wind)),
      powerCoefficient: (state) => formatPercent(coefficientOf(liveReading(state))),
      betzShare: (state) => formatPercent(betzShareOf(liveReading(state))),
      curvePitch: (state) => formatDegrees(liveReading(state).operating.pitchDeg),
    }),
    mountPowerCurve(root, store),
  ]);
}
