import { decodeFigure } from '@core/figure';
import { athleteData } from './athlete.data';
import { FigureRig } from './figureRig';

export function createFigureRig(): FigureRig {
  return new FigureRig(decodeFigure(athleteData));
}
