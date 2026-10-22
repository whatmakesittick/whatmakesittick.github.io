import { Vector3 } from 'three';
import type { Vector3Tuple } from 'three';
import { CANTILEVER, CATENARY, MAST } from './constants';

export interface CantileverPoints {
  readonly upperMount: Vector3Tuple;
  readonly upperEnd: Vector3Tuple;
  readonly lowerMount: Vector3Tuple;
  readonly apex: Vector3Tuple;
  readonly registrationStart: Vector3Tuple;
  readonly registrationEnd: Vector3Tuple;
  readonly steadyArmStart: Vector3Tuple;
  readonly steadyArmEnd: Vector3Tuple;
  readonly hookTop: Vector3Tuple;
  readonly hookBottom: Vector3Tuple;
}

function pointAtHeight(from: Vector3Tuple, to: Vector3Tuple, y: number): Vector3Tuple {
  const share = (y - from[1]) / (to[1] - from[1]);
  return [0, y, from[2] + (to[2] - from[2]) * share];
}

export function cantileverPoints(): CantileverPoints {
  const { upperY, lowerY, apexZ, reach, registrationY } = CANTILEVER;
  const lowerMount: Vector3Tuple = [0, lowerY, MAST.faceZ];
  const apex: Vector3Tuple = [0, upperY, apexZ];
  return {
    upperMount: [0, upperY, MAST.faceZ],
    upperEnd: [0, upperY, reach],
    lowerMount,
    apex,
    registrationStart: pointAtHeight(lowerMount, apex, registrationY),
    registrationEnd: [0, registrationY, CANTILEVER.registrationEnd],
    steadyArmStart: [0, registrationY - CANTILEVER.steadyArmDrop, CANTILEVER.steadyArmStart],
    steadyArmEnd: [0, CATENARY.contactY, 0],
    hookTop: [0, upperY, 0],
    hookBottom: [0, CATENARY.messengerY, 0],
  };
}

export function towards(from: Vector3Tuple, to: Vector3Tuple, length: number): Vector3Tuple {
  const start = new Vector3(...from);
  return new Vector3(...to).sub(start).setLength(length).add(start).toArray();
}
