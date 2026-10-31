import type { Readout } from '@core/explainer';
import type { ReadoutText } from '@core/ui/liveReadouts';
import { clamp } from '@core/math';
import { FULL_RISE_K, RACK_KW } from '../model';
import { coolantAt } from '../model/cooling';
import { hallPowerMw, rackPowerKw } from '../model/power';
import type { DataCenterStoreState } from '../state';
import { THEME } from '../theme';
import { TENTHS, formatCelsiusOf, formatPue, formatUnit } from './format';

export type ChapterReadouts = Readonly<Record<string, ReadoutText<DataCenterStoreState>>>;

const FULL_HALL_MW = hallPowerMw('liquid', 'full');

type Share = (state: DataCenterStoreState) => number;

function readout(
  id: string,
  value: ReadoutText<DataCenterStoreState>,
): Readout<DataCenterStoreState> {
  return { id, labelKey: `readouts.${id}`, numeric: true, value };
}

function meteredReadout(
  id: string,
  value: ReadoutText<DataCenterStoreState>,
  share: Share,
  fill: string,
): Readout<DataCenterStoreState> {
  return {
    ...readout(id, value),
    meter: { share: (state) => clamp(share(state), 0, 1), fill },
  };
}

function rackKw({ cooling, load }: DataCenterStoreState): number {
  return rackPowerKw(cooling, load);
}

function hallMw({ cooling, load }: DataCenterStoreState): number {
  return hallPowerMw(cooling, load);
}

function coolant({ cooling, load }: DataCenterStoreState) {
  return coolantAt(cooling, load);
}

function riseShare(state: DataCenterStoreState): number {
  const { supplyC, returnC } = coolant(state);
  return (returnC - supplyC) / FULL_RISE_K;
}

export const DATA_CENTER_READOUTS: readonly Readout<DataCenterStoreState>[] = [
  meteredReadout(
    'rackPower',
    (state) => formatUnit('kw', rackKw(state)),
    (state) => rackKw(state) / RACK_KW.liquid,
    THEME.current,
  ),
  meteredReadout(
    'hallPower',
    (state) => formatUnit('mw', hallMw(state), TENTHS),
    (state) => hallMw(state) / FULL_HALL_MW,
    THEME.toneDistribute,
  ),
  readout('pue', (state) => formatPue(state.benchmark)),
  readout('supply', (state) => {
    const { supplyC, medium } = coolant(state);
    return formatCelsiusOf(supplyC, medium);
  }),
  meteredReadout(
    'return',
    (state) => {
      const { returnC, medium } = coolant(state);
      return formatCelsiusOf(returnC, medium);
    },
    riseShare,
    THEME.coolantReturn,
  ),
];
