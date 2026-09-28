import { RECORD_OXYGEN_L_PER_MIN } from '../model';

const SITTING_STILL_L_PER_MIN = 0.25;

export const OXYGEN_RANGE = {
  min: SITTING_STILL_L_PER_MIN,
  max: RECORD_OXYGEN_L_PER_MIN,
  step: 0.05,
  default: SITTING_STILL_L_PER_MIN,
} as const;
