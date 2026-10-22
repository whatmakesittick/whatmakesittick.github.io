import { FIELD_WAVELENGTH_DRAWN } from './layout';

export const INSET_PACE = { ceilingDrawnMs: 1.5, halfSpeedMs: 25 } as const;

export const LOAD_ANGLE_SHARE = 0.12;

export function insetPace(speedMs: number): number {
  const speed = Math.max(0, speedMs);
  return (INSET_PACE.ceilingDrawnMs * speed) / (speed + INSET_PACE.halfSpeedMs);
}

export function patternOffset(shift: number): number {
  const turns = shift / FIELD_WAVELENGTH_DRAWN;
  return turns - Math.floor(turns);
}

export function fieldLead(reversed: boolean): number {
  return (reversed ? -LOAD_ANGLE_SHARE : LOAD_ANGLE_SHARE) * FIELD_WAVELENGTH_DRAWN;
}
