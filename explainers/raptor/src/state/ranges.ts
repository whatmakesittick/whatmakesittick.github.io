import { CUTOFF_TIME, altitudeKm } from '../model';

export const HEIGHT_RANGE = { min: 0, max: altitudeKm(CUTOFF_TIME), step: 0.5 } as const;
