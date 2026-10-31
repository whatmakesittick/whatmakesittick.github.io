import type { BenchmarkId, CoolingId, LoadId } from '../ids';

interface Band {
  min: number;
  max: number;
}

export const RACK_KW: Readonly<Record<CoolingId, number>> = { liquid: 120, air: 10 };
export const IDLE_SHARE = 0.3;
export const RACKS_PER_ROW = 12;
export const ROW_COUNT = 16;
export const RACK_COUNT = RACKS_PER_ROW * ROW_COUNT;
export const GPUS = 72;
export const CPUS = 36;
export const COMPUTE_TRAYS = 18;
export const SWITCH_TRAYS = 9;
export const POWER_SHELVES = 6;
export const BUSBAR_A = 1400;
export const BUSBAR_V = 50;
export const RACK_MASS_T = 1.4;
export const NVLINK_GPU_TBS = 1.8;
export const NVLINK_RACK_TBS = 130;
export const PUE: Readonly<Record<BenchmarkId, number>> = { average: 1.54, best: 1.09 };
export const CHAIN_LOSS_SHARE = 0.09;
export const SUPPLY_C = 25;
export const FULL_RISE_K = 20;
export const WATER_CP_KJ = 4.18;
export const RACK_FLOW_KG_S = RACK_KW.liquid / (WATER_CP_KJ * FULL_RISE_K);
export const FACILITY_WATER_C = 20;
export const CDU_APPROACH_K = 5;
export const CDU_KW = 2000;
export const CDU_AREA_M2 = 1.2;
export const AIR_INLET_C = 24;
export const AIR_M3H_PER_KW = 272;
export const AIR_RISE_K = 11.1;
export const FAN_SHARE: Readonly<Record<CoolingId, Readonly<Record<LoadId, number>>>> = {
  liquid: { idle: 0.3, full: 0.6 },
  air: { idle: 0.5, full: 1 },
};
export const GEN_START_S = 10;
export const GEN_REAL_S: Readonly<Band> = { min: 10, max: 60 };
export const UPS_MINUTES: Readonly<Band> = { min: 5, max: 15 };
export const GENSET_MW = 1.8;
export const GENSET_T = 17;
export const GENSET_FUEL_LPH = 465.6;
export const POWER_OUTAGE_PERCENT = 45;
export const FIBRE_US_PER_KM = 4.9;
export const SWITCH_NS = 700;
export const HALL_FIBRE_M = 100;
export const US_HOME_KWH = 10791;
export const EU_HOME_KWH = 3900;
export const CHARGER_W = 40;
export const HOURS_PER_YEAR = 8760;
export const WORLD_TWH_2024 = 415;
export const WORLD_PERCENT_2024 = 1.5;
export const US_WUE_L_KWH = 0.36;
export const US_WATER_BN_L = 66;
