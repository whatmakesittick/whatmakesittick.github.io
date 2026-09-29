import { SEA_LEVEL_PRESSURE_PA } from './atmosphere';

export const FLIGHT_THRUST_TF = 250;
export const EXIT_DIAMETER_M = 1.3;
export const EXIT_AREA_M2 = Math.PI * (EXIT_DIAMETER_M / 2) ** 2;
export const G0 = 9.80665;
export const MASS_FLOW_KG_S = 758;
export const MIXTURE_RATIO = 3.6;
export const CHAMBER_PRESSURE_BAR = 330;
export const ENGINE_MASS_KG = 1525;
export const FLAME_TEMPERATURE_K = 3500;
export const BOOSTER_ENGINES = 33;

const NEWTONS_PER_KILONEWTON = 1000;
const KG_PER_TONNE = 1000;
const METRES_PER_KM = 1000;
const MIXTURE_PARTS = MIXTURE_RATIO + 1;

function pressureThrustTf(airPa: number): number {
  return (airPa * EXIT_AREA_M2) / (G0 * NEWTONS_PER_KILONEWTON);
}

export const VACUUM_THRUST_TF = FLIGHT_THRUST_TF + pressureThrustTf(SEA_LEVEL_PRESSURE_PA);

export function thrustTf(throttle: number, airPa: number): number {
  return Math.max(0, throttle * VACUUM_THRUST_TF - pressureThrustTf(airPa));
}

export function massFlow(throttle: number): number {
  return throttle * MASS_FLOW_KG_S;
}

export function oxygenFlow(throttle: number): number {
  return (massFlow(throttle) * MIXTURE_RATIO) / MIXTURE_PARTS;
}

export function methaneFlow(throttle: number): number {
  return massFlow(throttle) / MIXTURE_PARTS;
}

export function specificImpulse(throttle: number, airPa: number): number {
  const flow = massFlow(throttle);
  if (flow <= 0) return 0;
  return (KG_PER_TONNE * thrustTf(throttle, airPa)) / flow;
}

export function exhaustSpeedKmS(throttle: number, airPa: number): number {
  return (specificImpulse(throttle, airPa) * G0) / METRES_PER_KM;
}

export function chamberPressureBar(throttle: number): number {
  return throttle * CHAMBER_PRESSURE_BAR;
}

export function thrustToWeight(thrust: number): number {
  return (thrust * KG_PER_TONNE) / ENGINE_MASS_KG;
}

export function boosterThrustTf(thrust: number): number {
  return BOOSTER_ENGINES * thrust;
}
