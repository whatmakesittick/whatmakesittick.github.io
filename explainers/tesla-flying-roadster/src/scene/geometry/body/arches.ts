import { WHEEL } from '../../parts/car/dimensions';

export const ARCH = {
  radius: WHEEL.radius + WHEEL.archClearance,
  centreY: WHEEL.centreY,
  innerZ: WHEEL.trackHalfZ - WHEEL.tyreWidth / 2 - WHEEL.archClearance,
  centresX: [WHEEL.frontX, WHEEL.rearX],
  edgeGap: 1e-4,
} as const;

export function archCeiling(x: number, floorY: number): number {
  const centre = ARCH.centresX.find((at) => Math.abs(x - at) <= ARCH.radius);
  if (centre === undefined) return floorY;
  const reach = Math.sqrt(ARCH.radius ** 2 - (x - centre) ** 2);
  return Math.max(floorY, ARCH.centreY + reach);
}

export function archEdges(): number[] {
  return ARCH.centresX.flatMap((centre) =>
    [-1, 1].flatMap((sign) => [
      centre + sign * ARCH.radius,
      centre + sign * (ARCH.radius + ARCH.edgeGap),
    ]),
  );
}

export function isUnderArch(x: number): boolean {
  return ARCH.centresX.some((centre) => Math.abs(x - centre) <= ARCH.radius);
}
