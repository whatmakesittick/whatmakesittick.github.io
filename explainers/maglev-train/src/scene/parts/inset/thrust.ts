import { ShapeGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import { centredRect } from './panel';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { INK, LAYER, OPACITY } from './constants';
import { insetMesh } from './insetMesh';
import type { InsetPart } from './insetMesh';
import { MAGNET_DRAWING } from './layout';
import { merged, rect, triangle } from './strokes';

const ARROW = { length: 0.22, shaft: 0.034, headLength: 0.085, headWidth: 0.1 } as const;
const HALO = { width: 0.32, height: 0.15 } as const;
const OFFSET = { x: -0.95, belowPoles: 0.13 } as const;

export const THRUST_NAME = 'gapInsetThrust';
export const THRUST_ARROW_NAME = 'gapInsetThrustArrow';

export type Thrust = 'forward' | 'backward' | 'none';

function arrowGeometry(): BufferGeometry {
  const half = ARROW.length / 2;
  const headBase = -half + ARROW.headLength;
  return merged([
    rect(headBase, -ARROW.shaft / 2, half, ARROW.shaft / 2),
    triangle([-half, 0], [headBase, -ARROW.headWidth / 2], [headBase, ARROW.headWidth / 2]),
  ]);
}

function haloGeometry(): BufferGeometry {
  return new ShapeGeometry(roundedRectShape(centredRect(HALO.width, HALO.height), HALO.height / 2));
}

export function thrustArrow(context: PartContext): InsetPart<[magnetTop: number, thrust: Thrust]> {
  const haloLook = { colour: INK.thrustHalo, opacity: OPACITY.thrustHalo };
  const halo = insetMesh(context, haloGeometry(), haloLook, LAYER.thrustHalo);
  const arrow = namedGroup(THRUST_ARROW_NAME);
  arrow.add(insetMesh(context, arrowGeometry(), { colour: INK.thrust }, LAYER.thrust));
  const group = namedGroup(THRUST_NAME);
  group.add(halo, arrow);
  group.position.x = OFFSET.x;
  return {
    group,
    draw(magnetTop, thrust) {
      group.position.y = magnetTop - MAGNET_DRAWING.poleStrip - OFFSET.belowPoles;
      group.visible = thrust !== 'none';
      arrow.scale.x = thrust === 'backward' ? -1 : 1;
    },
  };
}
