import { Matrix4, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { LAMP } from './constants';
import { TRAIN_FINISHES } from './finishes';
import { mirroredPair } from './mirror';
import { surfacePoint } from './nose';
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
  const point = new Vector3(...surfacePoint(CONTOUR.rows[row], x, ends));
  const along = new Vector3(...surfacePoint(CONTOUR.rows[row], x + STEP, ends)).sub(
    new Vector3(...surfacePoint(CONTOUR.rows[row], x - STEP, ends)),
  );
  const up = new Vector3(...surfacePoint(CONTOUR.rows[row + 1], x, ends)).sub(
    new Vector3(...surfacePoint(CONTOUR.rows[row - 1], x, ends)),
  );
  const normal = new Vector3().crossVectors(along, up).normalize();
  const across = new Vector3().crossVectors(normal, WORLD_UP).normalize();
  const tangent = new Vector3().crossVectors(normal, across);
  const basis = new Matrix4().makeBasis(across, tangent, normal);
  return basis.setPosition(point.addScaledVector(normal, LAMP.lift));
}

function lens(ends: SectionEnds, x: number, grow: number, depth: number): BufferGeometry {
  const geometry = new SphereGeometry(1, LAMP.segments, LAMP.rings);
  geometry.scale((LAMP.width / 2) * grow, (LAMP.height / 2) * grow, depth);
  geometry.applyMatrix4(frameAt(ends, x));
  geometry.deleteAttribute('uv');
  return geometry;
}

export function buildLamps(
  context: PartContext,
  ends: SectionEnds,
  tipX: number,
  finish: MaterialFinish,
  parent: Object3D,
): void {
  const direction = tipX > (ends.rearX + ends.frontX) / 2 ? -1 : 1;
  const x = tipX + direction * LAMP.distance;
  const layers = [
    [lens(ends, x, LAMP.bezelGrow, LAMP.depth / 2), TRAIN_FINISHES.bezel],
    [lens(ends, x, 1, LAMP.depth), finish],
  ] as const;
  layers.forEach(([geometry, layerFinish]) => {
    const mesh = finishMesh(context, mirroredPair(geometry), 'train', layerFinish);
    mesh.name = 'train';
    parent.add(mesh);
  });
}

export const LAMP_FINISHES = { head: TRAIN_FINISHES.lamp, tail: TRAIN_FINISHES.tailLamp } as const;
