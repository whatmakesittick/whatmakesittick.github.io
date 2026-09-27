import { Group } from 'three';
import type { Object3D } from 'three';
import { WIND_ARROWS } from '../constants';
import { arrowHead, unitShaft } from '../geometry/primitives';
import { anchorAt, partMesh } from './context';
import type { PartContext } from './context';

export interface WindArrowsPart {
  object: Group;
  labelAnchor: Object3D;
}

const POINT_DOWNWIND = -Math.PI / 2;

export function createWindArrows(context: PartContext): WindArrowsPart {
  const object = new Group();
  const shaft = unitShaft(WIND_ARROWS);
  const head = arrowHead(WIND_ARROWS);
  const arrows = WIND_ARROWS.positions.map(([y, z]) => {
    const arrow = new Group();
    const body = partMesh(context, shaft, 'wind', 'wind');
    body.scale.y = WIND_ARROWS.length - WIND_ARROWS.headLength;
    const tip = partMesh(context, head, 'wind', 'wind');
    tip.position.y = WIND_ARROWS.length;
    arrow.add(body, tip);
    arrow.rotation.z = POINT_DOWNWIND;
    arrow.position.set(WIND_ARROWS.x, y, z);
    object.add(arrow);
    return arrow;
  });
  const labelArrow = arrows[WIND_ARROWS.labelIndex];
  return {
    object,
    labelAnchor: anchorAt(labelArrow, 0, WIND_ARROWS.length / 2, 0),
  };
}
