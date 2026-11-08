import { Shape } from 'three';
import type { BufferGeometry } from 'three';
import { profileAlongX, roundedShape } from '../keyboard/geometry';
import type { Outline } from '../keyboard/geometry';

const HALF = 0.5;
const FELT_SHOULDER = 0.35;
const FELT_CROWN = { z: 0.45, y: 0.95 } as const;
const MOULDING_OUTLINE: Outline = [
  [0.28, 0],
  [0.3, 1],
  [-0.3, 1],
  [-0.3, 0.35],
  [-0.45, 0.12],
  [-0.4, 0],
];
const MOULDING_ROUND = 0.04;
const DETAIL = { bevel: 0.06, curves: 10 } as const;
const PLAIN_CURVES = 4;

function feltShape(): Shape {
  return new Shape()
    .moveTo(HALF, 0)
    .lineTo(HALF, FELT_SHOULDER)
    .quadraticCurveTo(FELT_CROWN.z, FELT_CROWN.y, 0, 1)
    .quadraticCurveTo(-FELT_CROWN.z, FELT_CROWN.y, -HALF, FELT_SHOULDER)
    .lineTo(-HALF, 0)
    .closePath();
}

export function unitFelt(detailed: boolean): BufferGeometry {
  return detailed
    ? profileAlongX(feltShape(), -HALF, HALF, DETAIL.bevel, DETAIL.curves)
    : profileAlongX(feltShape(), -HALF, HALF, 0, PLAIN_CURVES);
}

export function unitMoulding(detailed: boolean): BufferGeometry {
  const shape = roundedShape(MOULDING_OUTLINE, MOULDING_ROUND);
  return detailed
    ? profileAlongX(shape, -HALF, HALF, DETAIL.bevel, DETAIL.curves)
    : profileAlongX(shape, -HALF, HALF, 0, PLAIN_CURVES);
}
