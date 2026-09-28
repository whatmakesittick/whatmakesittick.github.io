import { Matrix4, Quaternion, Vector3 } from 'three';
import type { InstancedMesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { SCREW_HEAD, SEGMENTS } from '../../constants';
import { slottedHead } from '../../geometry/screw';
import { instancedMesh } from '../context';
import type { PartContext } from '../context';

export interface ScrewSeat {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const SLOT_TURN = 2.399;
const Z_AXIS = new Vector3(0, 0, 1);
const UNIT = new Vector3(1, 1, 1);

export function createScrews(context: PartContext, seats: readonly ScrewSeat[]): InstancedMesh {
  const geometry = slottedHead(SCREW_HEAD, SEGMENTS.hub);
  const mesh = instancedMesh(context, geometry, STRUCTURE_GROUP, 'blued', seats.length);
  const matrix = new Matrix4();
  const turn = new Quaternion();
  seats.forEach((seat, index) => {
    turn.setFromAxisAngle(Z_AXIS, index * SLOT_TURN);
    matrix.compose(new Vector3(seat.x, seat.y, seat.z), turn, UNIT);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
