import { clamp } from '@core/math';

export const FLIGHT_MODES = ['hover', 'forward'] as const;
export type FlightMode = (typeof FLIGHT_MODES)[number];

export const FORWARD_SHARE: Record<FlightMode, number> = { hover: 0, forward: 1 };

export const COLLECTIVE_RANGE = { min: 0, max: 1, step: 0.01, hover: 0.5 } as const;
const HOVER_BAND = 0.06;

export const VERTICAL_TENDENCIES = ['descend', 'hover', 'climb'] as const;
export type VerticalTendency = (typeof VERTICAL_TENDENCIES)[number];

export function clampCollective(collective: number): number {
  return clamp(collective, COLLECTIVE_RANGE.min, COLLECTIVE_RANGE.max);
}

export function verticalTendency(collective: number): VerticalTendency {
  const offset = collective - COLLECTIVE_RANGE.hover;
  if (offset < -HOVER_BAND) return 'descend';
  if (offset > HOVER_BAND) return 'climb';
  return 'hover';
}
