import { Matrix4, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartContext } from '../context';
import { LAMP } from './constants';
import { TRAIN_FINISHES, trainMesh } from './finishes';
import { mirroredPair } from './mirror';
import { noseTip, surfacePoint } from './nose';
import type { SectionEnds } from './nose';
import { CONTOUR } from './profile';

const STEP = 0.01;
const WORLD_UP = new Vector3(0, 1, 0);

function lampRow(): number {
  return CONTOUR.rows.reduce(
    (best, row, index) =>
      Math.abs(row.h - LAMP.h) < Math.abs(CONTOUR.rows[best].h - LAMP.h) ? index : best,
    0,
  );
}

function frameAt(ends: SectionEnds, x: number): Matrix4 {
  const row = lampRow();
  const at = (rowShift: number, dx: number) =>
    new Vector3(...surfacePoint(CONTOUR.rows[row + rowShift], x + dx, ends));
  const point = at(0, 0);
  const along = at(0, STEP).sub(at(0, -STEP));
  const up = at(1, 0).sub(at(-1, 0));
  const normal = new Vector3().crossVectors(along, up).normalize();
  const across = new Vector3().crossVectors(normal, WORLD_UP).normalize();
  const tangent = new Vector3().crossVectors(normal, across);
  const basis = new Matrix4().makeBasis(across, tangent, normal);
  return basis.setPosition(point.addScaledVector(normal, LAMP.lift));
}

function lens(ends: SectionEnds, x: number, grow: number, depth: number): BufferGeometry {
  const geometry = new SphereGeometry(1, LAMP.segments, LAMP.rings);
  geometry.scale((LAMP.width / 2) * grow, (LAMP.height / 2) * grow, depth);
  return geometry.applyMatrix4(frameAt(ends, x));
}

export function buildLamps(
  context: PartContext,
  ends: SectionEnds,
  finish: MaterialFinish,
  parent: Object3D,
): void {
  const [tipX, direction] = noseTip(ends);
  const x = tipX - direction * LAMP.distance;
  const layers = [
    [lens(ends, x, LAMP.bezelGrow, LAMP.depth / 2), TRAIN_FINISHES.bezel],
    [lens(ends, x, 1, LAMP.depth), finish],
  ] as const;
  layers.forEach(([geometry, layerFinish]) =>
    parent.add(trainMesh(context, mirroredPair(geometry), layerFinish)),
  );
}
