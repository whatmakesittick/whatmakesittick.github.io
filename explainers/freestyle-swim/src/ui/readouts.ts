import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import { PACES, PEAK_FORCE_N } from '../model';
import { strokeReading } from '../state';
import type { SwimStoreState } from '../state';
import { THEME } from '../theme';
import { formatMeters, formatMetersPerSecond, formatNewtons, formatPerMinute } from './format';
import { dragUpText, pullingArm } from './text';

export const DRAG_METER_MAX_N = 150;
export const SPEED_METER_MAX_MS = 2.6;

function share(value: number, max: number): number {
  return clamp(value / max, 0, 1);
}

function handForce(state: SwimStoreState): number {
  return pullingArm(strokeReading(state)).handForceN;
}

function dragShare(state: SwimStoreState): number {
  if (state.headUp) return 1;
  return share(strokeReading(state).dragN, DRAG_METER_MAX_N);
}

export function dragText(state: SwimStoreState): string {
  if (state.headUp) return dragUpText();
  return formatNewtons(strokeReading(state).dragN);
}

export const SWIM_READOUTS: readonly Readout<SwimStoreState>[] = [
  {
    id: 'speed',
    labelKey: 'readouts.speed',
    numeric: true,
    value: (state) => formatMetersPerSecond(strokeReading(state).speedMs),
    meter: {
      share: (state) => share(strokeReading(state).speedMs, SPEED_METER_MAX_MS),
      fill: THEME.forward,
    },
  },
  {
    id: 'strokeRate',
    labelKey: 'readouts.strokeRate',
    numeric: true,
    value: (state) => formatPerMinute(PACES[state.pace].strokeRate),
  },
  {
    id: 'strokeLength',
    labelKey: 'readouts.strokeLength',
    numeric: true,
    value: (state) => formatMeters(PACES[state.pace].strokeLengthM),
  },
  {
    id: 'handForce',
    labelKey: 'readouts.handForce',
    numeric: true,
    value: (state) => formatNewtons(handForce(state)),
    meter: { share: (state) => share(handForce(state), PEAK_FORCE_N), fill: THEME.thrust },
  },
  {
    id: 'drag',
    labelKey: 'readouts.drag',
    numeric: true,
    value: dragText,
    meter: { share: dragShare, fill: THEME.drag },
  },
];
