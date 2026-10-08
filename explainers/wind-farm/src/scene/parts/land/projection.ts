import type { Bounds } from './fieldPlan';

export interface Projection {
  readonly size: number;
  readonly step: number;
  pixel(x: number, z: number): [number, number];
  scale(x: number, z: number): number;
}

interface AxisWarp {
  share(value: number): number;
  slope(value: number): number;
}

function axisWarp(min: number, max: number, softness: number): AxisWarp {
  const centre = (min + max) / 2;
  const warp = (value: number) => Math.asinh((value - centre) / softness);
  const from = warp(min);
  const span = warp(max) - from;
  return {
    share: (value) => (warp(value) - from) / span,
    slope: (value) => 1 / (softness * Math.hypot(1, (value - centre) / softness) * span),
  };
}

export function boxProjection(
  bounds: Bounds,
  size: number,
  softness: number,
  step: number,
): Projection {
  const across = axisWarp(bounds.minX, bounds.maxX, softness);
  const down = axisWarp(bounds.minZ, bounds.maxZ, softness);
  return {
    size,
    step,
    pixel: (x, z) => [across.share(x) * size, down.share(z) * size],
    scale: (x, z) => size * Math.sqrt(across.slope(x) * down.slope(z)),
  };
}

export function discProjection(
  radius: number,
  size: number,
  softness: number,
  step: number,
): Projection {
  const half = size / 2;
  const span = Math.log1p(radius / softness);
  const reach = (distance: number) => (half * Math.log1p(distance / softness)) / span;
  const radial = (distance: number) => half / ((softness + distance) * span);
  return {
    size,
    step,
    pixel: (x, z) => {
      const distance = Math.hypot(x, z);
      const ratio = distance > 0 ? reach(distance) / distance : radial(0);
      return [half + x * ratio, half + z * ratio];
    },
    scale: (x, z) => {
      const distance = Math.hypot(x, z);
      const around = distance > 0 ? reach(distance) / distance : radial(0);
      return Math.sqrt(radial(distance) * around);
    },
  };
}

export function projectedUv(projection: Projection, x: number, z: number): [number, number] {
  const [px, py] = projection.pixel(x, z);
  return [px / projection.size, 1 - py / projection.size];
}
