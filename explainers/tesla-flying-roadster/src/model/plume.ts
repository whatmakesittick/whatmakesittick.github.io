import type { GasId } from '../ids';
import { PLUME_COLOURS } from '../theme';
import { CORNER_NOZZLE_MAX_N } from './constants';

export const PLUME_LENGTH_M = 1.5;

export interface PlumeStyle {
  lengthScale: number;
  colour: string;
  opacity: number;
}

const CONDENSATION_LENGTH_SCALE = 1;
const CONDENSATION_OPACITY = 0.85;
const HELIUM_LENGTH_SCALE = 1.6;
const HELIUM_OPACITY = 0.45;

const PLUME_STYLES: Readonly<Record<GasId, Readonly<PlumeStyle>>> = {
  air: {
    lengthScale: CONDENSATION_LENGTH_SCALE,
    colour: PLUME_COLOURS.air,
    opacity: CONDENSATION_OPACITY,
  },
  nitrogen: {
    lengthScale: CONDENSATION_LENGTH_SCALE,
    colour: PLUME_COLOURS.nitrogen,
    opacity: CONDENSATION_OPACITY,
  },
  helium: {
    lengthScale: HELIUM_LENGTH_SCALE,
    colour: PLUME_COLOURS.helium,
    opacity: HELIUM_OPACITY,
  },
};

export function plumeStyle(gas: GasId): Readonly<PlumeStyle> {
  return PLUME_STYLES[gas];
}

export function plumeLength(thrustN: number, gas: GasId): number {
  return (
    ((PLUME_LENGTH_M * Math.max(thrustN, 0)) / CORNER_NOZZLE_MAX_N) * plumeStyle(gas).lengthScale
  );
}
