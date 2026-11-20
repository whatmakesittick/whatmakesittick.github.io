import type { FigureRig } from './parts/swimmer/figure/figureRig';

export async function loadFigureRig(): Promise<FigureRig> {
  const { createFigureRig } = await import('./parts/swimmer/figure/createRig');
  return createFigureRig();
}
