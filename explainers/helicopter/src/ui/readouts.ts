import type { Readout } from '@core/explainer';
import { clamp } from '@core/math';
import {
  BLADE_PITCH_DEGREES,
  CYCLIC_PITCH_DEGREES,
  FORWARD_SHARE,
  bladePitch,
  rotorHalf,
  tipSpeed,
} from '../model';
import type { HelicopterState, HelicopterStoreState } from '../state';
import { formatDegrees, formatPitch, formatRpm, formatSpeed, halfLabel } from './format';
import { HALF_TONES, PITCH_METER_FILL } from './palette';

const STEEPEST_PITCH = BLADE_PITCH_DEGREES.full + CYCLIC_PITCH_DEGREES;

export function markedBladePitch(state: HelicopterState): number {
  return bladePitch(state.phase, state.collective, FORWARD_SHARE[state.flightMode]);
}

function pitchShare(state: HelicopterState): number {
  return clamp(markedBladePitch(state) / STEEPEST_PITCH, 0, 1);
}

export const HELICOPTER_READOUTS: readonly Readout<HelicopterStoreState>[] = [
  {
    id: 'azimuth',
    labelKey: 'readouts.azimuth',
    numeric: true,
    value: (state) => formatDegrees(state.phase),
  },
  {
    id: 'half',
    labelKey: 'readouts.half',
    numeric: false,
    value: (state) => halfLabel(rotorHalf(state.phase)),
    tone: (state) => HALF_TONES[rotorHalf(state.phase)],
  },
  {
    id: 'rotor-speed',
    labelKey: 'readouts.rotorSpeed',
    numeric: true,
    value: (state) => formatRpm(state.speed),
  },
  {
    id: 'tip-speed',
    labelKey: 'readouts.tipSpeed',
    numeric: true,
    value: (state) => formatSpeed(tipSpeed(state.speed)),
  },
  {
    id: 'blade-pitch',
    labelKey: 'readouts.bladePitch',
    numeric: true,
    value: (state) => formatPitch(markedBladePitch(state)),
    meter: { share: pitchShare, fill: PITCH_METER_FILL },
  },
];
