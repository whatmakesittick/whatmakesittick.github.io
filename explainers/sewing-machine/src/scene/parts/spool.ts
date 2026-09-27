import type { Object3D } from 'three';
import { Group } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ARM, SPOOL, SPOOL_BOTTOM, SPOOL_TOP } from '../constants';
import { verticalCylinder } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface SpoolPart {
  object: Group;
  labelAnchor: Object3D;
}

export function createSpool(context: PartContext): SpoolPart {
  const { windRadius, flangeRadius, flangeThickness, pinRadius, pinHeight } = SPOOL;
  const object = new Group();
  object.position.set(SPOOL.x, 0, SPOOL.z);
  object.add(
    partMesh(
      context,
      verticalCylinder(pinRadius, ARM.top, ARM.top + pinHeight),
      STRUCTURE_GROUP,
      'chrome',
    ),
    partMesh(
      context,
      verticalCylinder(flangeRadius, SPOOL_BOTTOM, SPOOL_BOTTOM + flangeThickness),
      'spool',
      'spoolCap',
    ),
    partMesh(
      context,
      verticalCylinder(windRadius, SPOOL_BOTTOM + flangeThickness, SPOOL_TOP - flangeThickness),
      'spool',
      'topThread',
    ),
    partMesh(
      context,
      verticalCylinder(flangeRadius, SPOOL_TOP - flangeThickness, SPOOL_TOP),
      'spool',
      'spoolCap',
    ),
  );
  return { object, labelAnchor: anchorAt(object, -flangeRadius, SPOOL_TOP, 0) };
}
