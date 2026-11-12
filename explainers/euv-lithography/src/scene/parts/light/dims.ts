import { PHASE_RANGES, SCAN_START_UNITS } from '../../../model/run';

export const PRE_PULSE_UNITS = PHASE_RANGES.prepulse.start;
export const MAIN_PULSE_UNITS = PHASE_RANGES.plasma.start;
export const PLASMA_PEAK_UNITS = 300;
export const FLARE_END_UNITS = PHASE_RANGES.plasma.end;
export const AFTERGLOW_END_UNITS = PHASE_RANGES.collect.end;
export const AFTERGLOW_LEVEL = 0.12;
export const LASER_REST_LEVEL = 0.25;
export const LASER_PULSE_WIDTH_UNITS = 14;
export const LASER_FADE_START_UNITS = 300;
export const GUIDE_LEVEL = 0.05;
export const SCAN_UNITS = SCAN_START_UNITS;
export const EXPOSE_START_UNITS = PHASE_RANGES.expose.start;

export const NOZZLE_Y = 2.6;
export const PLASMA_Y = 1.2;
export const CATCHER_Y = 0.4;
export const STREAM_BEADS = 12;
export const STREAM_SPACING_M = 0.2;
export const STREAM_SPEED_MS = 1.6;
export const BEAD_RADIUS_M = 0.012;
export const BEAD_FADE_M = 0.2;
export const BEAD_CLEAR_M = 0.1;
export const DISC_SPREAD = 3.3;
export const DISC_THIN = 0.15;
export const BEAD_SEGMENTS = [10, 8] as const;

export const CORE_RADIUS_M = 0.045;
export const FLARE_SIZES_M = [0.5, 1.1, 2.2, 3.6] as const;
export const FLARE_OPACITIES = [1, 0.9, 0.5, 0.3] as const;
export const FLARE_WHITE = '#ffffff';
export const PLASMA_LIGHT = { intensity: 3, distance: 3.5, decay: 2 } as const;
export const SHIMMER = { speedA: 37, speedB: 23.1, depthA: 0.12, depthB: 0.08 } as const;

export const LASER = { coreRadius: 0.03, glowRadius: 0.1, sides: 10, coreMix: 0.55 } as const;
export const EUV = { coreRadius: 0.028, glowRadius: 0.11, sides: 8, coreMix: 0.5 } as const;
export const CONE = { sides: 32, peak: 0.55, floor: 0.3, riseUnits: 30, fallUnits: 40 } as const;
export const SPOT = { size: 0.7, base: 1.2 } as const;

export const TRAIL = { lengthM: 0.8, samples: 14, sides: 6, radiusShare: 0.75 } as const;
export const MARKER = { segments: [16, 12], glowScale: 14, labelLift: 1.6 } as const;
