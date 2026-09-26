import { Vector2 } from 'three';
import { normalizeAngle, toDegrees } from '../../model';

export interface CamProfileOptions {
  baseRadius: number;
  rollerRadius: number;
  samples: number;
}

const QUARTER_TURN_DEGREES = 90;
const CRANK_DEGREES_PER_CAM_DEGREE = 2;
const DERIVATIVE_STEP = 1e-3;

export function crankAngleFacingFollower(localAngle: number): number {
  return normalizeAngle(
    CRANK_DEGREES_PER_CAM_DEGREE * (toDegrees(localAngle) + QUARTER_TURN_DEGREES),
  );
}

export function camProfile(
  liftAt: (crankAngle: number) => number,
  options: CamProfileOptions,
): Vector2[] {
  const pitchRadius = (angle: number) =>
    options.baseRadius + options.rollerRadius + liftAt(crankAngleFacingFollower(angle));
  const points: Vector2[] = [];
  for (let i = 0; i < options.samples; i++) {
    const angle = (Math.PI * 2 * i) / options.samples;
    const radius = pitchRadius(angle);
    const slope =
      (pitchRadius(angle + DERIVATIVE_STEP) - pitchRadius(angle - DERIVATIVE_STEP)) /
      (2 * DERIVATIVE_STEP);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tangent = new Vector2(slope * cos - radius * sin, slope * sin + radius * cos).normalize();
    const outward = new Vector2(tangent.y, -tangent.x);
    points.push(
      new Vector2(radius * cos, radius * sin).addScaledVector(outward, -options.rollerRadius),
    );
  }
  return points;
}
