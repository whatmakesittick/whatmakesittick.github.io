export const ATP_PER_O2 = 5;
export const MOLAR_VOLUME_L = 22.4;
export const ATP_MOLAR_MASS_G = 507.18;
export const REST_OXYGEN_L_PER_MIN = 0.245;
export const RECORD_OXYGEN_L_PER_MIN = 7.4;

const MINUTES_PER_HOUR = 60;
const GRAMS_PER_KILOGRAM = 1000;

export function atpKgPerMinute(oxygenLitresPerMinute: number): number {
  const oxygenMoles = oxygenLitresPerMinute / MOLAR_VOLUME_L;
  return (oxygenMoles * ATP_PER_O2 * ATP_MOLAR_MASS_G) / GRAMS_PER_KILOGRAM;
}

export function atpKgPerHour(oxygenLitresPerMinute: number): number {
  return atpKgPerMinute(oxygenLitresPerMinute) * MINUTES_PER_HOUR;
}

export function timesRest(oxygenLitresPerMinute: number): number {
  return oxygenLitresPerMinute / REST_OXYGEN_L_PER_MIN;
}
