import { CylinderGeometry, Group, TorusGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { NEEDLE } from '../../model';
import { GROOVE_Z, NEEDLE_BAR_SHAPE, NEEDLE_SHAPE } from '../constants';
import { box, cylinderAlongX, verticalCylinder } from '../geometry/primitives';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface NeedlePart {
  object: Group;
  needleAnchor: Object3D;
  barAnchor: Object3D;
  threadAnchor: Object3D;
  setTipHeight(height: number): void;
}

const CHEEK_DEPTH_SHARE = 0.85;
const GUIDE_SEGMENTS = 12;
const LABEL_SIDE = -1;
const NEEDLE_LABEL_HEIGHT = NEEDLE_SHAPE.scarfTop;
const THREAD_LABEL_RISE = 6;
const BAR_LABEL_RISE = 8;

function tipGeometry(): BufferGeometry {
  const { tipLength, segments } = NEEDLE_SHAPE;
  const geometry = new CylinderGeometry(NEEDLE.radius, 0, tipLength, segments);
  geometry.translate(0, tipLength / 2, 0);
  return geometry;
}

function cheekGeometry(side: number): BufferGeometry {
  const { eyeBottom, eyeTop, eyeHalfGap } = NEEDLE_SHAPE;
  const inner = side * eyeHalfGap;
  const outer = side * NEEDLE.radius;
  const depth = NEEDLE.radius * CHEEK_DEPTH_SHARE;
  return box({
    minX: Math.min(inner, outer),
    maxX: Math.max(inner, outer),
    minY: eyeBottom,
    maxY: eyeTop,
    minZ: -depth,
    maxZ: depth,
  });
}

function scarfGeometry(): BufferGeometry {
  const { eyeTop, scarfTop, scarfFlatten, segments } = NEEDLE_SHAPE;
  const geometry = verticalCylinder(NEEDLE.radius, eyeTop, scarfTop, segments);
  geometry.scale(1, 1, scarfFlatten);
  geometry.translate(0, 0, NEEDLE.radius * (1 - scarfFlatten));
  return geometry;
}

function taperGeometry(): BufferGeometry {
  const { bladeTop, shankBottom, shankRadius, segments } = NEEDLE_SHAPE;
  const geometry = new CylinderGeometry(
    shankRadius,
    NEEDLE.radius,
    shankBottom - bladeTop,
    segments,
  );
  geometry.translate(0, (bladeTop + shankBottom) / 2, 0);
  return geometry;
}

function needleGeometries(): BufferGeometry[] {
  const { tipLength, eyeBottom, scarfTop, bladeTop, shankBottom, shankRadius, length, segments } =
    NEEDLE_SHAPE;
  return [
    tipGeometry(),
    verticalCylinder(NEEDLE.radius, tipLength, eyeBottom, segments),
    cheekGeometry(1),
    cheekGeometry(-1),
    scarfGeometry(),
    verticalCylinder(NEEDLE.radius, scarfTop, bladeTop, segments),
    taperGeometry(),
    verticalCylinder(shankRadius, shankBottom, length, segments),
  ];
}

function guideGeometry(): BufferGeometry {
  const { guideRadius, guideTube, clampBottom, guideAbove, guideZ } = NEEDLE_BAR_SHAPE;
  const geometry = new TorusGeometry(guideRadius, guideTube, GUIDE_SEGMENTS / 2, GUIDE_SEGMENTS);
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, clampBottom + guideAbove, guideZ);
  return geometry;
}

function barGeometries(): BufferGeometry[] {
  const { radius, length, clampBottom, clampTop, clampHalf, screwRadius, screwLength } =
    NEEDLE_BAR_SHAPE;
  const screw = cylinderAlongX(screwRadius, clampHalf, clampHalf + screwLength);
  screw.translate(0, (clampBottom + clampTop) / 2, 0);
  return [
    verticalCylinder(radius, clampTop, clampTop + length),
    box({
      minX: -clampHalf,
      maxX: clampHalf,
      minY: clampBottom,
      maxY: clampTop,
      minZ: -clampHalf,
      maxZ: clampHalf,
    }),
    screw,
    guideGeometry(),
  ];
}

export function createNeedle(context: PartContext): NeedlePart {
  const object = new Group();
  const needle = new Group();
  const bar = new Group();
  needleGeometries().forEach((geometry) =>
    needle.add(partMesh(context, geometry, 'needle', 'needleSteel')),
  );
  barGeometries().forEach((geometry) => bar.add(partMesh(context, geometry, 'needleBar', 'steel')));
  object.add(needle, bar);
  return {
    object,
    needleAnchor: anchorAt(needle, LABEL_SIDE * NEEDLE.radius, NEEDLE_LABEL_HEIGHT, 0),
    barAnchor: anchorAt(
      bar,
      LABEL_SIDE * NEEDLE_BAR_SHAPE.radius,
      NEEDLE_BAR_SHAPE.clampTop + BAR_LABEL_RISE,
      0,
    ),
    threadAnchor: anchorAt(needle, 0, NEEDLE_LABEL_HEIGHT + THREAD_LABEL_RISE, GROOVE_Z),
    setTipHeight: (height) => {
      object.position.y = height;
    },
  };
}
