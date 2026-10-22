import { Group, ShapeGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { roundedRectShape } from '@core/scene/geometry/extrude';
import type { PartContext } from '../context';
import { INK, LAYER, OPACITY } from './constants';
import { insetMesh } from './insetMesh';
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
  const halfWidth = HALO.width / 2;
  const halfHeight = HALO.height / 2;
  const shape = roundedRectShape(
    { minA: -halfWidth, minB: -halfHeight, maxA: halfWidth, maxB: halfHeight },
    halfHeight,
  );
  return new ShapeGeometry(shape);
}

export class ThrustArrow {
  readonly group = new Group();
  private readonly arrow: Group = new Group();

  constructor(context: PartContext) {
    const haloLook = { colour: INK.thrustHalo, opacity: OPACITY.thrustHalo };
    const halo = insetMesh(context, haloGeometry(), haloLook, LAYER.thrustHalo);
    this.arrow.add(insetMesh(context, arrowGeometry(), { colour: INK.thrust }, LAYER.thrust));
    this.group.add(halo, this.arrow);
    this.group.position.x = OFFSET.x;
    this.group.name = THRUST_NAME;
    this.arrow.name = THRUST_ARROW_NAME;
  }

  place(magnetTop: number): void {
    this.group.position.y = magnetTop - MAGNET_DRAWING.poleStrip - OFFSET.belowPoles;
  }

  point(thrust: Thrust): void {
    this.group.visible = thrust !== 'none';
    this.arrow.scale.x = thrust === 'backward' ? -1 : 1;
  }
}
