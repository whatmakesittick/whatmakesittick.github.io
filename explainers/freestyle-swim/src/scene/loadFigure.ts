import type { FigureResources } from './assembly';

export async function loadFigure(): Promise<FigureResources> {
  const [{ createFigureRig }, { buildSwimmer }] = await Promise.all([
    import('./parts/swimmer/figure/createRig'),
    import('./parts/swimmer/buildSwimmer'),
  ]);
  return { rig: createFigureRig(), buildSwimmer };
}
