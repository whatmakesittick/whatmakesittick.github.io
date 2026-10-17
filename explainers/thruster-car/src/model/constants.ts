import type { GasId, TankChoiceId } from '../ids';
import { CAR } from './layout';

export { GAS_IDS } from '../ids';

export const G = 9.80665;
export const CAR_MASS_KG = CAR.mass;
export const TANK_PRESSURE_BAR = 700;

export const GAS_DENSITY_KG_M3: Readonly<Record<GasId, number>> = {
  air: 525.6,
  nitrogen: 489.9,
  helium: 85.7,
};

export const EXHAUST_SPEED_MS: Readonly<Record<GasId, number>> = {
  air: 698,
  nitrogen: 720,
  helium: 1823,
};

export const WORK_PER_KG_KJ: Readonly<Record<GasId, number>> = {
  air: 452,
  nitrogen: 452,
  helium: 3461,
};

export const MIRAI_TANK_L = 122.4;
export const MIRAI_TANK_KG = 87.5;
export const TANK_SHELL_KG_PER_L = MIRAI_TANK_KG / MIRAI_TANK_L;
export const FULL_COMPRESSIBILITY = 1.55;

export const TANK_LITRES: Readonly<Record<TankChoiceId, number>> = { '400': 400, '600': 600 };
export const DEFAULT_TANK_LITRES = TANK_LITRES['600'];

export const REAR_THRUST_FULL_N = 80000;
export const CORNER_NOZZLE_MAX_N = 8000;
export const ROLL_NOZZLE_N = 2000;
export const ROLL_INERTIA_KG_M2 = 600;

export const PRESSURE_EXPONENT = 3;
export const EMPTY_BELOW_BAR = 5;

export const FILL_POWER_KW = 50;
export const ROTOR_HOVER_KW = 155;
export const SIXTY_MPH_MS = 26.82;
export const BRAKE_DECEL = 2.0;
export const LANDING_SQUAT_M = 0.08;
