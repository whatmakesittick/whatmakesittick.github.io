import { decodeFigure } from '@core/figure';
import type { Figure } from '@core/figure';

export async function loadFigure(): Promise<Figure> {
  const { athleteData } = await import('./parts/swimmer/figure/athlete.data');
  return decodeFigure(athleteData);
}
