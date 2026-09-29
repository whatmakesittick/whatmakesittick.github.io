import { THROTTLE_KEYS, altitudeKm } from '../model';

const HEIGHT_STEP_KM = 0.5;
const FULL_THROTTLE = 1;
const LAST_FULL_THROTTLE_TIME = Math.max(
  ...THROTTLE_KEYS.filter(([, share]) => share === FULL_THROTTLE).map(([time]) => time),
);

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

export const HEIGHT_RANGE = {
  min: 0,
  max: floorToStep(altitudeKm(LAST_FULL_THROTTLE_TIME), HEIGHT_STEP_KM),
  step: HEIGHT_STEP_KM,
} as const;
