import type { Object3D } from 'three';
import { Group, TorusGeometry } from 'three';
import { toRadians } from '@core/math';
import { lerp } from '../../model';
import { TAKE_UP, TAKE_UP_EYE_Z } from '../constants';
import { box, cylinderAlongZ } from '../geometry/primitives';
import { anchorAt, partMesh } from './context';
import type { PartContext } from './context';

export interface TakeUpLeverPart {
  object: Group;
  labelAnchor: Object3D;
  setLift(share: number): void;
}

export interface LeverEye {
  x: number;
  y: number;
  z: number;
}

const RING_TUBE_SEGMENTS = 8;
const RING_SEGMENTS = 20;

function leverAngle(share: number): number {
  return lerp(TAKE_UP.lowDegrees, TAKE_UP.highDegrees, share);
}

export function leverEye(share: number): LeverEye {
  const radians = toRadians(leverAngle(share));
  return {
    x: TAKE_UP.pivotX - TAKE_UP.length * Math.cos(radians),
    y: TAKE_UP.pivotY + TAKE_UP.length * Math.sin(radians),
    z: TAKE_UP_EYE_Z,
  };
}

export function createTakeUpLever(context: PartContext): TakeUpLeverPart {
  const { length, barWidth, barThickness, barZ, eyeRadius, eyeTube, bossRadius, bossDepth } =
    TAKE_UP;
  const bossBack = barZ - barThickness;
  const object = new Group();
  object.position.set(TAKE_UP.pivotX, TAKE_UP.pivotY, 0);
  const arm = new Group();
  const ring = new TorusGeometry(eyeRadius, eyeTube, RING_TUBE_SEGMENTS, RING_SEGMENTS);
  ring.translate(-length, 0, TAKE_UP_EYE_Z);
  arm.add(
    partMesh(
      context,
      box({
        minX: -length + eyeRadius,
        maxX: 0,
        minY: -barWidth / 2,
        maxY: barWidth / 2,
        minZ: barZ,
        maxZ: barZ + barThickness,
      }),
      'takeUpLever',
      'chrome',
    ),
    partMesh(context, ring, 'takeUpLever', 'chrome'),
    partMesh(
      context,
      cylinderAlongZ(bossRadius, bossBack, bossBack + bossDepth),
      'takeUpLever',
      'steel',
    ),
  );
  object.add(arm);
  return {
    object,
    labelAnchor: anchorAt(arm, -length, eyeRadius, TAKE_UP_EYE_Z),
    setLift: (share) => {
      arm.rotation.z = -toRadians(leverAngle(share));
    },
  };
}
