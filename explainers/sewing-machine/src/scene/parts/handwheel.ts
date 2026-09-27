import type { Object3D } from 'three';
import { Group, TorusGeometry } from 'three';
import { toRadians } from '@core/math';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { HANDWHEEL } from '../constants';
import { cylinderAlongX } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface HandwheelPart {
  object: Group;
  labelAnchor: Object3D;
  setAngle(degrees: number): void;
}

const GRIP_SEGMENTS = 48;
const GRIP_TUBE_SEGMENTS = 8;
const MARKER_INSET = 9;
const LABEL_REACH = 0.72;

function gripGeometry(): TorusGeometry {
  const geometry = new TorusGeometry(
    HANDWHEEL.radius,
    HANDWHEEL.gripTube,
    GRIP_TUBE_SEGMENTS,
    GRIP_SEGMENTS,
  );
  geometry.rotateY(Math.PI / 2);
  geometry.translate(HANDWHEEL.width / 2, 0, 0);
  return geometry;
}

export function createHandwheel(context: PartContext): HandwheelPart {
  const { width, radius, hubRadius, hubDepth, markerSize, markerDepth } = HANDWHEEL;
  const object = new Group();
  object.position.set(HANDWHEEL.inner, HANDWHEEL.y, HANDWHEEL.z);
  const spin = new Group();
  const markerY = radius - MARKER_INSET;
  spin.add(
    partMesh(context, cylinderAlongX(radius, 0, width), 'handwheel', 'trim'),
    partMesh(context, gripGeometry(), 'handwheel', 'rubber'),
    partMesh(context, cylinderAlongX(hubRadius, width, width + hubDepth), 'handwheel', 'chrome'),
    partMesh(
      context,
      box({
        minX: width,
        maxX: width + markerDepth,
        minY: markerY - markerSize / 2,
        maxY: markerY + markerSize / 2,
        minZ: -markerSize / 2,
        maxZ: markerSize / 2,
      }),
      'handwheel',
      'paint',
    ),
  );
  object.add(spin);
  const labelAnchor = anchorAt(object, width, radius * LABEL_REACH, radius * LABEL_REACH);
  return {
    object,
    labelAnchor,
    setAngle: (degrees) => {
      spin.rotation.x = toRadians(degrees);
    },
  };
}
