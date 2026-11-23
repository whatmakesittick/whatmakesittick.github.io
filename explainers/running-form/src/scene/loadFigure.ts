import type { FigureRig } from '@core/figure/body/figureRig';

export interface RunnerFigure {
  rig: FigureRig;
}

export async function loadFigure(): Promise<RunnerFigure> {
  const { createFigureRig } = await import('./parts/runner/figure/createRig');
  return { rig: createFigureRig() };
}
