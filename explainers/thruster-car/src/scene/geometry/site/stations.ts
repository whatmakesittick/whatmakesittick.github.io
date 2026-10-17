import { rampFrame, rampLength, rampU } from './rampFrame';
import type { RampFrame } from './rampFrame';
import { RIB } from './rampSpec';

export const STATION_SPACING = 1.2;

export function rampStations(): RampFrame[] {
  const inset = RIB.thickness / 2;
  const span = rampLength() - inset * 2;
  const count = Math.max(1, Math.round(span / STATION_SPACING));
  return Array.from({ length: count + 1 }, (_, index) =>
    rampFrame(rampU(inset + (span * index) / count)),
  );
}
