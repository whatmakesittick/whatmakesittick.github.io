import type { FigureData } from './data';

export interface TestBody {
  readonly name: string;
  readonly loadData: () => Promise<FigureData>;
  readonly fixtures: URL;
}

export const TEST_BODIES: readonly TestBody[] = [
  {
    name: 'swimmer',
    loadData: async () =>
      (
        await import('../../../explainers/freestyle-swim/src/scene/parts/swimmer/figure/athlete.data')
      ).athleteData,
    fixtures: new URL('./fixtures/', import.meta.url),
  },
];
