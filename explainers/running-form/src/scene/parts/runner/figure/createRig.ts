import { decodeFigure } from '@core/figure';
import { FigureRig } from '@core/figure/body/figureRig';
import { FIGURE_FROM_RUNNER } from './frame';
import { athleteData } from './runner.data';

export function createFigureRig(): FigureRig {
  return new FigureRig(decodeFigure(athleteData), FIGURE_FROM_RUNNER);
}
