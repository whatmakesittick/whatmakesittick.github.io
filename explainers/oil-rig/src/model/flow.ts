import { hydrostaticBar, porePressureBar } from './pressure';
import { fluidLeg } from './rocks';

export type FlowState = 'natural' | 'assisted';

const OIL_LEG = fluidLeg('oil');

export const PERFORATION_DEPTH_M = (OIL_LEG.top + OIL_LEG.bottom) / 2;
export const INITIAL_RESERVOIR_PRESSURE_BAR = porePressureBar(PERFORATION_DEPTH_M);
export const PRESSURE_DECLINE_PER_YEAR = 0.014;
export const OIL_DENSITY = 0.85;
export const OIL_COLUMN_BAR = hydrostaticBar(OIL_DENSITY, PERFORATION_DEPTH_M);
export const MINIMUM_FLOWING_PRESSURE_BAR = 20;

export function reservoirPressureBar(years: number): number {
  return INITIAL_RESERVOIR_PRESSURE_BAR * (1 - PRESSURE_DECLINE_PER_YEAR * years);
}

export function wellheadPressureBar(years: number): number {
  return Math.max(0, reservoirPressureBar(years) - OIL_COLUMN_BAR);
}

export function flowState(years: number): FlowState {
  return wellheadPressureBar(years) > MINIMUM_FLOWING_PRESSURE_BAR ? 'natural' : 'assisted';
}
