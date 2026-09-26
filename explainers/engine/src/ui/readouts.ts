import type { Readout } from '@core/explainer';
import { crankGeometry, gasState, peakPressure, pistonSpeed, strokeAt } from '../model';
import type { EngineSpec } from '../model';
import { currentSpec } from '../state';
import type { EngineState, EngineStoreState } from '../state';
import { formatDegrees, formatPressure, formatRpm, formatSpeed, strokeLabel } from './format';
import { PRESSURE_METER_FILL, STROKE_TONES } from './palette';

const STANDSTILL_SPEED = 0.001;
const DIRECTION_ARROWS = { down: '↓', up: '↑' } as const;

function perSpec<T>(compute: (spec: EngineSpec) => T): (state: EngineState) => T {
  let cachedKey: string | undefined;
  let cached: T | undefined;
  return (state) => {
    const key = `${state.engineType}:${state.compressionRatio}`;
    if (key !== cachedKey || cached === undefined) {
      cachedKey = key;
      cached = compute(currentSpec(state));
    }
    return cached;
  };
}

const peakPressureOf = perSpec(peakPressure);

function pressureOf(state: EngineState): number {
  return gasState(state.phase, currentSpec(state)).pressure;
}

function logarithmicShare(value: number, maximum: number): number {
  if (value <= 1) return 0;
  return Math.min(1, Math.log(value) / Math.log(maximum));
}

function describePistonSpeed(speed: number): string {
  if (Math.abs(speed) < STANDSTILL_SPEED) return formatSpeed(0);
  const arrow = speed < 0 ? DIRECTION_ARROWS.down : DIRECTION_ARROWS.up;
  return `${formatSpeed(speed)} ${arrow}`;
}

export const ENGINE_READOUTS: readonly Readout<EngineStoreState>[] = [
  {
    id: 'angle',
    labelKey: 'readouts.crankAngle',
    numeric: true,
    value: (state) => formatDegrees(state.phase),
  },
  {
    id: 'stroke',
    labelKey: 'readouts.stroke',
    numeric: false,
    value: (state) => strokeLabel(strokeAt(state.phase)),
    tone: (state) => STROKE_TONES[strokeAt(state.phase)],
  },
  {
    id: 'rpm',
    labelKey: 'readouts.engineSpeed',
    numeric: true,
    value: (state) => formatRpm(state.speed),
  },
  {
    id: 'pressure',
    labelKey: 'readouts.pressure',
    numeric: true,
    value: (state) => formatPressure(pressureOf(state)),
    meter: {
      share: (state) => logarithmicShare(pressureOf(state), peakPressureOf(state)),
      fill: PRESSURE_METER_FILL,
    },
  },
  {
    id: 'piston-speed',
    labelKey: 'readouts.pistonSpeed',
    numeric: true,
    value: (state) =>
      describePistonSpeed(pistonSpeed(state.phase, crankGeometry(currentSpec(state)), state.speed)),
  },
];
