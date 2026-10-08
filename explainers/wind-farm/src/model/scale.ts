import {
  BUILT_HA_PER_MW,
  FARM_RATED_KW,
  FOOTBALL_PITCH_M2,
  PROJECT_HA_PER_MW,
  SWEPT_AREA_M2,
} from './constants';

const KW_PER_MW = 1000;
const HECTARES_PER_KM2 = 100;
const SECONDS_PER_MINUTE = 60;

export function sweptPitches(): number {
  return SWEPT_AREA_M2 / FOOTBALL_PITCH_M2;
}

export function farmRatedMw(): number {
  return FARM_RATED_KW / KW_PER_MW;
}

export function builtHectares(): number {
  return BUILT_HA_PER_MW * farmRatedMw();
}

export function projectKm2(): number {
  return (PROJECT_HA_PER_MW * farmRatedMw()) / HECTARES_PER_KM2;
}

export function turnSeconds(rpm: number): number {
  return rpm > 0 ? SECONDS_PER_MINUTE / rpm : Infinity;
}
