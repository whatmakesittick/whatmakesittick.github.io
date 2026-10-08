export const ROTOR_DIAMETER_M = 150;
export const ROTOR_RADIUS_M = ROTOR_DIAMETER_M / 2;
export const HUB_HEIGHT_M = 105;
export const TIP_HEIGHT_M = HUB_HEIGHT_M + ROTOR_RADIUS_M;
export const BLADE_LENGTH_M = 73.7;
export const MAX_CHORD_M = 4.2;
export const SWEPT_AREA_M2 = 17_671;
export const AIR_DENSITY = 1.225;

export const RATED_KW = 4200;
export const CUT_IN_MS = 3;
export const RATED_WIND_MS = 12;
export const RAMP_START_MS = 20;
export const CUT_OUT_MS = 24.5;
export const RESTART_MS = 22.5;
export const MAX_RPM = 10.4;
export const GEAR_RATIO = 143;
export const MODEL_TIP_SPEED_RATIO = 8;
export const FEATHER_DEG = 90;
export const STOP_MINUTES = 20;
export const START_MINUTES = 20;
export const BETZ_LIMIT = 16 / 27;

export const TURBINE_COUNT = 27;
export const FARM_RATED_KW = TURBINE_COUNT * RATED_KW;
export const ACROSS_SPACING_D = 4;
export const DEFAULT_SPACING_D = 7;
export const WAKE_DECAY = 0.075;
export const PLUME_VISIBLE_DEFICIT = 0.03;
export const MAX_PLUME_D = 20;
export const SHEAR_EXPONENT = 1 / 7;

export const GENERATOR_VOLTS = 800;
export const COLLECTOR_KV = 36;
export const GRID_KV = 110;

export const HOME_KWH_PER_YEAR = 10_791;
export const HOURS_PER_YEAR = 8760;
export const ANNUAL_MWH_PER_TURBINE = 14_692;
export const CARBON_G_PER_KWH = 7.3;
export const PAYBACK_MONTHS = 7.6;
export const DESIGN_LIFE_YEARS = 20;
export const BUILT_HA_PER_MW = 0.3;
export const PROJECT_HA_PER_MW = 34;
export const FOOTBALL_PITCH_M2 = 7140;

export const WIND_FROM_DEG = 270;
export const VEER_DEG = 6;
