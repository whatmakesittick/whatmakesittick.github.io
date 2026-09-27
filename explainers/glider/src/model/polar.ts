import { clamp } from '@core/math';

export const GLIDER_TYPES = ['trainer', 'racer15', 'racer18'] as const;
export type GliderType = (typeof GLIDER_TYPES)[number];

export const DEFAULT_GLIDER: GliderType = 'racer18';

export interface PolarPoint {
  speed: number;
  sink: number;
}

export interface Polar {
  minSink: PolarPoint;
  fast: PolarPoint;
}

export interface Glider {
  span: number;
  chord: number;
  polar: Polar;
}

export interface BestGlide {
  speed: number;
  ratio: number;
}

export const GLIDERS: Record<GliderType, Glider> = {
  trainer: {
    span: 17,
    chord: 1.06,
    polar: { minSink: { speed: 75, sink: 0.65 }, fast: { speed: 200, sink: 3.6 } },
  },
  racer15: {
    span: 15,
    chord: 0.58,
    polar: { minSink: { speed: 80, sink: 0.53 }, fast: { speed: 200, sink: 1.5 } },
  },
  racer18: {
    span: 18,
    chord: 0.55,
    polar: { minSink: { speed: 80, sink: 0.48 }, fast: { speed: 200, sink: 1.4 } },
  },
};

export const POLAR_SPEED = { min: 75, max: 200, step: 5, default: 105 } as const;

const KMH_PER_METRE_PER_SECOND = 3.6;

export function kmhToMetresPerSecond(kmh: number): number {
  return kmh / KMH_PER_METRE_PER_SECOND;
}

export function clampPolarSpeed(kmh: number): number {
  return clamp(kmh, POLAR_SPEED.min, POLAR_SPEED.max);
}

function curvature({ minSink, fast }: Polar): number {
  return (fast.sink - minSink.sink) / (fast.speed - minSink.speed) ** 2;
}

export function sinkRate(type: GliderType, kmh: number): number {
  const { polar } = GLIDERS[type];
  return polar.minSink.sink + curvature(polar) * (kmh - polar.minSink.speed) ** 2;
}

export function speedForSink(type: GliderType, sink: number): number {
  const { polar } = GLIDERS[type];
  const excess = Math.max(0, sink - polar.minSink.sink);
  return polar.minSink.speed + Math.sqrt(excess / curvature(polar));
}

export function glideRatio(type: GliderType, kmh: number): number {
  return kmhToMetresPerSecond(kmh) / sinkRate(type, kmh);
}

export function bestGlide(type: GliderType): BestGlide {
  const { polar } = GLIDERS[type];
  const tangentSpeed = Math.sqrt(polar.minSink.speed ** 2 + polar.minSink.sink / curvature(polar));
  const speed = clampPolarSpeed(tangentSpeed);
  return { speed, ratio: glideRatio(type, speed) };
}
