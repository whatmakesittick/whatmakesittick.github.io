export const MILLIMOLAR_PER_MOLAR = 1000;

export const BISULFITE_START_M = 0.0125;
export const IODATE_REF_M = 0.025;
export const STARCH_PERCENT = 0.125;
export const VOLUME_ML = 400;

export const IODATE_RANGE_MM = { min: 10, max: 50, step: 2.5, default: 25 } as const;
export const TEMPERATURE_RANGE_C = { min: 5, max: 40, step: 1, default: 20 } as const;

export const REF_DELAY_S = 10;
export const REF_TEMPERATURE_C = 20;
export const COLD_DELAY_FACTOR = 1.5;
export const COLD_SPAN_C = 20;
export const MIN_SWITCH_S = 3;
export const COLOUR_RATIO_LIMIT = 3;

export function toMolar(millimolar: number): number {
  return millimolar / MILLIMOLAR_PER_MOLAR;
}

export function toMillimolar(molar: number): number {
  return molar * MILLIMOLAR_PER_MOLAR;
}

export function warmthFactor(temperatureC: number): number {
  return COLD_DELAY_FACTOR ** ((REF_TEMPERATURE_C - temperatureC) / COLD_SPAN_C);
}

export function switchSeconds(iodateM: number, temperatureC: number): number {
  const delay = ((REF_DELAY_S * IODATE_REF_M) / iodateM) * warmthFactor(temperatureC);
  return Math.max(MIN_SWITCH_S, delay);
}

export function bisulfiteRatio(iodateM: number): number {
  return BISULFITE_START_M / iodateM;
}
