import { Matrix4 } from 'three';
import type { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import {
  FigureRig as BodyRig,
  figureOrigin,
  rigFromFigure as rigFrom,
} from '@core/figure/body/figureRig';

const FIGURE_FROM_RIG = new Matrix4().set(0, 0, -1, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 1);

export { figureOrigin };

export function rigFromFigure(origin: Vector3): Matrix4 {
  return rigFrom(FIGURE_FROM_RIG, origin);
}

export class FigureRig extends BodyRig {
  constructor(figure: Figure) {
    super(figure, FIGURE_FROM_RIG);
  }
}
