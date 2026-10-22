import { PlaneGeometry } from 'three';
import type { Mesh } from 'three';
import { FINISHES } from '../../finishes';
import { LINE_GROUP, finishMesh } from '../context';
import type { PartContext } from '../context';
import { GROUND } from './constants';

const QUARTER_TURN = Math.PI / 2;

export function groundPlane(context: PartContext): Mesh {
  const { reach, period } = GROUND;
  const geometry = new PlaneGeometry(reach * 2 + period, reach * 2);
  geometry.rotateX(-QUARTER_TURN);
  geometry.translate(period / 2, 0, 0);
  const mesh = finishMesh(context, geometry, LINE_GROUP, FINISHES.field);
  mesh.name = 'ground';
  mesh.receiveShadow = true;
  return mesh;
}
