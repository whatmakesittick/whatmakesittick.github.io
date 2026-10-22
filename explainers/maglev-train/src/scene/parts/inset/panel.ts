import { ShapeGeometry } from 'three';
import type { Object3D } from 'three';
import { roundedRectHole, roundedRectShape } from '@core/scene/geometry/extrude';
import type { Rect } from '@core/scene/geometry/extrude';
import { INSET } from '../../../model';
import type { PartContext } from '../context';
import { INK, LAYER, OPACITY, PANEL_CORNER, STROKE } from './constants';
import { insetMesh } from './insetMesh';

function panelRect(inset: number): Rect {
  const halfWidth = INSET.width / 2 - inset;
  const halfHeight = INSET.height / 2 - inset;
  return { minA: -halfWidth, minB: -halfHeight, maxA: halfWidth, maxB: halfHeight };
}

function frameGeometry(): ShapeGeometry {
  const outer = roundedRectShape(panelRect(0), PANEL_CORNER);
  outer.holes.push(roundedRectHole(panelRect(STROKE.frame), PANEL_CORNER - STROKE.frame));
  return new ShapeGeometry(outer);
}

export function buildPanel(context: PartContext): Object3D[] {
  const ground = new ShapeGeometry(roundedRectShape(panelRect(0), PANEL_CORNER));
  const groundLook = { colour: INK.ground, opacity: OPACITY.ground };
  const frameLook = { colour: INK.frame };
  return [
    insetMesh(context, ground, groundLook, LAYER.ground),
    insetMesh(context, frameGeometry(), frameLook, LAYER.frame),
  ];
}
