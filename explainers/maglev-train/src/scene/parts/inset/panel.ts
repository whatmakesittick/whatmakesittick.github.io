import { ShapeGeometry } from 'three';
import type { Object3D } from 'three';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import type { Rect } from '@core/scene/geometry/extrude';
import { INSET } from '../../../model';
import type { PartContext } from '../context';
import { INK, LAYER, OPACITY, PANEL_CORNER, STROKE } from './constants';
import { insetMesh } from './insetMesh';

export function centredRect(width: number, height: number, inset = 0): Rect {
  const halfWidth = width / 2 - inset;
  const halfHeight = height / 2 - inset;
  return { minA: -halfWidth, minB: -halfHeight, maxA: halfWidth, maxB: halfHeight };
}

export function roundedCard(
  width: number,
  height: number,
  corner: number,
  rim: number,
): [ground: ShapeGeometry, frame: ShapeGeometry] {
  const frame = roundedRectShape(centredRect(width, height), corner);
  frame.holes.push(roundedRectHole(centredRect(width, height, rim), corner - rim));
  const ground = roundedRectShape(centredRect(width, height), corner);
  return [new ShapeGeometry(ground), new ShapeGeometry(frame)];
}

export function buildPanel(context: PartContext): Object3D[] {
  const [ground, frame] = roundedCard(INSET.width, INSET.height, PANEL_CORNER, STROKE.frame);
  return [
    insetMesh(context, ground, { colour: INK.ground, opacity: OPACITY.ground }, LAYER.ground),
    insetMesh(context, frame, { colour: INK.frame }, LAYER.frame),
  ];
}
