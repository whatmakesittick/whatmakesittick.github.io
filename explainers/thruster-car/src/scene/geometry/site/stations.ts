import { RAMP_LENGTH } from '../../../model/layout';
import { rampFrames } from './rampFrame';
import type { RampFrame } from './rampFrame';
import { RIB } from './rampSpec';

export const STATION_SPACING = 1.2;

export function rampStations(): RampFrame[] {
  const inset = RIB.thickness / 2;
  const span = RAMP_LENGTH - inset * 2;
  return rampFrames(Math.max(1, Math.round(span / STATION_SPACING)), inset, RAMP_LENGTH - inset);
}
