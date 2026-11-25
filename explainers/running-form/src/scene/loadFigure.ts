import type { FigureRig } from '@core/figure/body/figureRig';
import { yieldToMain } from '@core/scene/pacing';

export interface LoadedFigure {
  rig: FigureRig;
}

export async function loadFigure(): Promise<LoadedFigure> {
  const { createFigureRig } = await import('./parts/runner/figure/createRig');
  await yieldToMain();
  return { rig: createFigureRig() };
}
