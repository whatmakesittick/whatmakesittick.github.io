import { Group, TorusGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HEAD, THREAD_GUIDES } from '../constants';
import { cylinderAlongZ, verticalCylinder } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

const RING_TUBE_SEGMENTS = 6;
const RING_SEGMENTS = 16;

function ring(x: number, y: number, z: number, axis: 'x' | 'y'): BufferGeometry {
  const geometry = new TorusGeometry(
    THREAD_GUIDES.eyeRadius,
    THREAD_GUIDES.eyeTube,
    RING_TUBE_SEGMENTS,
    RING_SEGMENTS,
  );
  if (axis === 'x') geometry.rotateY(Math.PI / 2);
  else geometry.rotateX(Math.PI / 2);
  geometry.translate(x, y, z);
  return geometry;
}

function topGuide(): BufferGeometry[] {
  const { x, y, z, bracketBack, bracketHeight } = THREAD_GUIDES.top;
  const half = THREAD_GUIDES.postRadius;
  return [
    box({
      minX: x - half,
      maxX: x + half,
      minY: HEAD.top,
      maxY: HEAD.top + bracketHeight,
      minZ: bracketBack,
      maxZ: z - THREAD_GUIDES.eyeRadius,
    }),
    ring(x, y, z, 'x'),
  ];
}

function checkPost(): BufferGeometry {
  const { x, y, length } = THREAD_GUIDES.check;
  const geometry = cylinderAlongZ(THREAD_GUIDES.postRadius, HEAD.front, HEAD.front + length);
  geometry.translate(x, y, 0);
  return geometry;
}

function faceGuide(): BufferGeometry[] {
  const { x, y, z } = THREAD_GUIDES.face;
  const post = verticalCylinder(
    THREAD_GUIDES.postRadius / 2,
    y + THREAD_GUIDES.eyeRadius,
    HEAD.bottom + THREAD_GUIDES.faceOverlap,
  );
  post.translate(x, 0, z - THREAD_GUIDES.eyeRadius);
  return [post, ring(x, y, z, 'y')];
}

export function createThreadGuides(context: PartContext): Group {
  const object = new Group();
  [...topGuide(), checkPost(), ...faceGuide()].forEach((geometry) =>
    object.add(partMesh(context, geometry, STRUCTURE_GROUP, 'chrome')),
  );
  return object;
}
