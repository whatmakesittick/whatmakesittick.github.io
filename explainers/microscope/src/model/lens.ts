export const NEAR_POINT_MM = 250;

export function imageDistance(focalLength: number, objectDistance: number): number {
  return 1 / (1 / focalLength - 1 / objectDistance);
}

export function lateralMagnification(objectDistance: number, imageDistance: number): number {
  return -imageDistance / objectDistance;
}

export function focalLengthFor(objectDistance: number, imageDistance: number): number {
  return (objectDistance * imageDistance) / (objectDistance + imageDistance);
}

export function magnifierPower(focalLength: number): number {
  return NEAR_POINT_MM / focalLength;
}

export function magnifierFocalLength(power: number): number {
  return NEAR_POINT_MM / power;
}

export function refractedSlope(slope: number, height: number, focalLength: number): number {
  return slope - height / focalLength;
}
