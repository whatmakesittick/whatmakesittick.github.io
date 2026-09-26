import { Vector3 } from 'three';
import type { Box3 } from 'three';
import type { FramingSlopes } from './lens';

export interface CameraPose {
  position: Vector3;
  target: Vector3;
}

const UP = new Vector3(0, 1, 0);

function boxCorners(box: Box3): Vector3[] {
  const corners: Vector3[] = [];
  [box.min.x, box.max.x].forEach((x) =>
    [box.min.y, box.max.y].forEach((y) =>
      [box.min.z, box.max.z].forEach((z) => corners.push(new Vector3(x, y, z))),
    ),
  );
  return corners;
}

export function frameBox(
  box: Box3,
  direction: Vector3,
  slopes: FramingSlopes,
  margin: number,
): CameraPose {
  const center = box.getCenter(new Vector3());
  const forward = direction.clone().negate();
  const right = new Vector3().crossVectors(forward, UP).normalize();
  const up = new Vector3().crossVectors(right, forward);
  const verticalSlope = slopes.vertical / margin;
  const horizontalSlope = slopes.horizontal / margin;
  const distance = boxCorners(box).reduce((required, corner) => {
    const offset = corner.sub(center);
    const toward = offset.dot(direction);
    const vertical = Math.abs(offset.dot(up)) / verticalSlope;
    const horizontal = Math.abs(offset.dot(right)) / horizontalSlope;
    return Math.max(required, toward + Math.max(vertical, horizontal));
  }, 0);
  return { position: center.clone().addScaledVector(direction, distance), target: center };
}
