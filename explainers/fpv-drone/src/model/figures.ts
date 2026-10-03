import type { PacketRate, SpeedsterId, VideoId } from '../ids';

export const MASS_G = { dry: 650, battery: 450, defaultPayload: 300, maxPayload: 1500 } as const;

export const MOTOR_COUNT = 4;
export const THRUST_PER_MOTOR_G = { flight: 2000, bench: 2200 } as const;

export const PACK = {
  cells: 6,
  cellNominalV: 3.6,
  cellFullV: 4.2,
  cellEmptyV: 3,
  capacityMah: 4200,
  energyWh: 91,
  massG: MASS_G.battery,
  resistanceOhm: 0.06,
} as const;

export const HOVER_POWER_REF = { watts: 250, allUpG: 1100 } as const;
export const CRUISE_POWER_FACTOR = 0.8;
export const USABLE_ENERGY_SHARE = 0.8;
export const MIN_THRUST_TO_WEIGHT = 1.2;
export const CRUISE_TILT_DEG = 30;

export const MAX_RATE_DEG_S = 670;

export const SENSITIVITY_DBM: Readonly<Record<PacketRate, number>> = {
  50: -115,
  150: -112,
  250: -108,
  500: -105,
};
export const LINK_REACH_M = { near: 50, far: 10_000 } as const;

export interface AnalogueVideoFigures {
  latencyMinMs: number;
  latencyMaxMs: number;
  channels: number;
}

export interface DigitalVideoFigures {
  latencyMs: number;
  rangeKm: number;
  lines: number;
  framesPerSecond: number;
}

export const VIDEO_FIGURES: Readonly<Record<VideoId, AnalogueVideoFigures | DigitalVideoFigures>> =
  {
    analogue: { latencyMinMs: 20, latencyMaxMs: 30, channels: 40 },
    digital: { latencyMs: 20, rangeKm: 10, lines: 1080, framesPerSecond: 100 },
  };

export const TOP_SPEED_KMH: Readonly<Record<SpeedsterId, number>> = {
  longRange: 140,
  racer: 263,
  record: 657.59,
};
